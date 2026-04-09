'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { encryptSession } from '@/lib/session';
import { getPatronProfileByUsername, getPatronProfile } from '@/actions/patron';
import { KOHA_API_URL, getValidLibraryToken } from '@/lib/koha';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Use global object to survive dev reloads.
// TODO: For multi-instance/serverless production, replace this with a Redis/KV-backed rate limiter (e.g., Upstash)
const globalAny = global as any;
globalAny.loginLocks = globalAny.loginLocks || new Set<string>();
const loginLocks = globalAny.loginLocks as Set<string>;

globalAny.pwdLocks = globalAny.pwdLocks || new Set<string>();
const pwdLocks = globalAny.pwdLocks as Set<string>;

globalAny.otpStore = globalAny.otpStore || new Map<string, { hash: string, expires: number }>();
const otpStore = globalAny.otpStore as Map<string, { hash: string, expires: number }>;

globalAny.otpRateLimits = globalAny.otpRateLimits || new Map<string, number[]>();
const otpRateLimits = globalAny.otpRateLimits as Map<string, number[]>;

function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function loginPatron(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required.' };
  }

  if (loginLocks.has(username)) {
    return { error: 'Please wait a moment before trying again.' };
  }
  loginLocks.add(username);
  setTimeout(() => loginLocks.delete(username), 3000); // 3 second rate-limit debounce

  // Enforce email domain (Optional but good for MIT-WPU)
  if (!username.endsWith('@mitwpu.edu.in')) {
    return { error: 'Please use your official @mitwpu.edu.in email address.' };
  }

  const plainCredentials = `${username}:${password}`;
  const encodedCredentials = Buffer.from(plainCredentials).toString('base64');

  try {
    const response = await fetch(`${KOHA_API_URL}/biblios?_per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Accept': 'application/json'
      }
    });

    if (response.status === 401) {
      return { error: 'Invalid username or password.' };
    }

    if (response.status === 403) {
      const errorData = await response.json();
      
      // THE DEFINITIVE CHECK: 
      // If Koha checked permissions, it means the password was 100% correct.
      if (errorData && errorData.required_permissions) {
        // SUCCESS! Issue the cookie.
        const profile = await getPatronProfileByUsername(username);
        if (!profile || !profile.id) {
          return { error: 'Unable to retrieve patron profile from the library server.' };
        }
        const sessionData = JSON.stringify(profile);

        const cookieStore = await cookies();
        cookieStore.set({
          name: 'koha_patron_auth',
          value: encryptSession(sessionData),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 3600 * 24 // 24 hour session
        });

        return { success: true };
      } else {
        // It's a 403, but not the one we want. Reject the login.
        return { error: 'Invalid username or password.' };
      }
    }

    // If it's 200 OK, it means they are staff. Also a success.
    if (response.ok) {
      const profile = await getPatronProfileByUsername(username);
      if (!profile || !profile.id) {
        return { error: 'Unable to retrieve patron profile from the library server.' };
      }
      const sessionData = JSON.stringify(profile);

      const cookieStore = await cookies();
      cookieStore.set({
        name: 'koha_patron_auth',
        value: encryptSession(sessionData),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 3600 * 24 
      });
      return { success: true };
    }

    return { error: 'Invalid username or password.' };

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred connecting to the library server.' };
  }
}

export async function logoutPatron() {
  const cookieStore = await cookies();
  cookieStore.delete('koha_patron_auth');
  redirect('/login');
}

export async function requestPasswordChangeOTP(formData: FormData) {
  const profile = await getPatronProfile();
  
  // 1. VERIFY SESSION (Authentication)
  if (!profile || !profile.id) {
    return { error: 'Unauthorized. You must be logged in.' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match.' };
  }

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    return { error: 'Password must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character.' };
  }

  // 2. RATE LIMITING (Max 5 requests per hour)
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;
  let attempts = otpRateLimits.get(profile.email) || [];
  attempts = attempts.filter(t => t > oneHourAgo); // Clear old attempts
  
  if (attempts.length >= 5) {
    return { error: 'Too many OTP requests. Please try again later.' };
  }
  
  if (pwdLocks.has(profile.email)) {
    return { error: 'Please wait a moment before trying again.' };
  }
  pwdLocks.add(profile.email);
  setTimeout(() => pwdLocks.delete(profile.email), 5000);

  // 3. VERIFY CURRENT PASSWORD (CSRF & Hijack Protection)
  const plainCredentials = `${profile.email}:${currentPassword}`;
  const encodedCredentials = Buffer.from(plainCredentials).toString('base64');

  try {
    const authCheck = await fetch(`${KOHA_API_URL}/biblios?_per_page=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (authCheck.status === 401) {
      return { error: 'Incorrect current password.' };
    }

    // 4. GENERATE & HASH OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = hashString(otpCode);
    
    otpStore.set(profile.email, {
      hash: hashedOTP,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    attempts.push(now);
    otpRateLimits.set(profile.email, attempts);

    // 5. SEND EMAIL VIA NODEMAILER
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333;">MIT-WPU Library Password Reset</h2>
        <p style="color: #555; line-height: 1.5;">You requested to change your library account password. Please use the following 6-digit verification code to complete the process:</p>
        <div style="background-color: #f4f4f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 36px; letter-spacing: 8px; color: #111; margin: 0;">${otpCode}</h1>
        </div>
        <p style="color: #777; font-size: 14px;">This code will expire in <strong>5 minutes</strong>. If you did not request this, please ignore this email and secure your account.</p>
      </div>
    `;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('FATAL: GMAIL_USER or GMAIL_APP_PASSWORD is not set in .env.local');
      otpStore.delete(profile.email);
      return { error: 'Server email configuration is missing. Please contact an administrator.' };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: '"MIT Library Portal" <' + process.env.GMAIL_USER + '>',
        to: profile.email,
        subject: 'Your Library Password Verification Code',
        html: emailHtml
      });
    } catch (emailError: any) {
      console.error('Nodemailer Error:', emailError);
      otpStore.delete(profile.email);
      return { error: `Email delivery failed: ${emailError.message}` };
    }

    return { success: true, requiresOTP: true, message: 'Verification code sent to your email!' };

  } catch (error) {
    console.error('Password change error:', error);
    return { error: 'An unexpected network error occurred.' };
  }
}

export async function verifyOTPAndChangePassword(formData: FormData) {
  const profile = await getPatronProfile();
  if (!profile || !profile.id) {
    return { error: 'Unauthorized. You must be logged in.' };
  }

  const otp = formData.get('otp') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!otp || !newPassword) {
    return { error: 'Missing required fields.' };
  }

  // 1. VERIFY OTP WITH HASH
  const storedOTP = otpStore.get(profile.email);
  if (!storedOTP || storedOTP.expires < Date.now() || storedOTP.hash !== hashString(otp)) {
    return { error: 'Invalid or expired verification code.' };
  }

  // Clear the OTP to prevent reuse
  otpStore.delete(profile.email);

  try {
    // 2. ESCALATE PRIVILEGES SAFELY
    const appToken = await getValidLibraryToken();

    // 3. UPDATE PASSWORD
    const updateReq = await fetch(`${KOHA_API_URL}/patrons/${profile.id}/password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${appToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        password: newPassword,
        password_2: newPassword
      })
    });

    if (!updateReq.ok) {
      const errData = await updateReq.json().catch(() => ({}));
      console.error('Koha Password Update Failed:', errData);
      return { error: errData.error || errData.message || 'Library server rejected the password change.' };
    }

    return { success: true, message: 'Password updated successfully!' };
  } catch (error) {
    console.error('OTP Password change error:', error);
    return { error: 'An unexpected network error occurred.' };
  }
}
