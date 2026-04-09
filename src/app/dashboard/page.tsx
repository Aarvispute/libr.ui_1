import { getPatronProfile } from "../../actions/patron";
import { DashboardInteractiveShell } from "./dashboard-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LightRays } from "@/components/magicui/light-rays";
import Image from "next/image";
import { User } from "lucide-react";
import { redirect } from "next/navigation";

function RulesView() {
  return (
    <div className="h-full rounded-2xl border bg-muted/30 backdrop-blur-sm overflow-hidden flex flex-col relative">
      <LightRays speed={5} />
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar my-4 relative z-10" style={{ direction: "rtl" }}>
        <div className="max-w-4xl mx-auto space-y-6" style={{ direction: "ltr" }}>
          <h1 className="text-3xl font-bold text-center mb-8">KRC Rules & Regulations</h1>

          <Card>
            <CardHeader>
              <CardTitle>General Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>KRC is open throughout the year except for Sundays and University Holidays from 8.00 to 20.00 Hours and Saturday from 8.00 to 18.30 hours.</li>
                <li>University I Card is mandatory to visit the KRC. The same will be treated as membership card.</li>
                <li>KRC is a Silent Zone. Students must maintain silence all the time.</li>
                <li>Keep mobile sets on silent mode when you are in the KRC premises.</li>
                <li>Eatables are strictly prohibited.</li>
                <li>Users can avail Reprography Facility on payment basis.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membership Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>All students, faculty members and staff of MITWPU are members of KRC.</li>
                <li>The tenure of student’s membership is valid only up to the completion of the course.</li>
                <li>The membership is also provided to MITWPU Alumni on payment basis.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Circulation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Students are permitted to borrow five books for the period of fifteen days.</li>
                <li>For renewals, books have to physically present to KRC and renewal is allowed if no reservations/claim against those books.</li>
                <li>Reference books, bound volumes, journals are not lent out of the KRC.</li>
                <li>Books in damaged condition will not be accepted from the reader.</li>
                <li>Loss of books should be immediately reported to the Librarian. The member shall either replace the books of same edition or pay the cost of the book as per current market price.</li>
                <li>Borrowing facility can be withdrawn in case of any kind of misbehavior.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Digital Library Rules</CardTitle>
            </CardHeader>
            <CardContent>
                <h3 className="font-semibold mb-2">Guidelines for Fair Use of e-Resources</h3>
                <p className="mb-4 text-muted-foreground">Access to and use of electronic resources and online content is restricted to authorized users within the University premises. The users are responsible for using these resources for academic & noncommercial use only.</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Electronic resources includes e-journals, e-databases, e-books and open access material.</li>
                <li>These resources can be browsed, may be downloaded and used as per publisher’s policy. Downloading or printing of a complete book or an entire issue or a volume of one or more journals (called systematic downloading) is strictly prohibited.</li>
                <li>Any violation of this policy will result in penal action and block to the entire community of users at university from accessing those particular resources.</li>
                <li>KRC subscribes E-Resources directly through the publishers and authorized vendors as per eSS Consortium. The terms and conditions for using these resources are indicated in electronic resource license agreements with each publisher. It is the responsibility of individual users to ensure that the use of these resources does not breach the terms and conditions specified in the license agreements.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TeamView() {
  const teamMembers = [
    {
      name: "DR. Praveenkumar Vaidya",
      role: "Librarian",
      imageSrc: "/Praveenkumar-Vaidya-librarian-KRC.webp",
    },
    { name: "Dhumal Vandana", role: "Assistant Librarian"},
    { name: "Salunkhe Amol", role: "Sr. Executive - Library" },
    { name: "Team Member 4", role: "Librarian" },
    { name: "Team Member 5", role: "Librarian" },
    { name: "Team Member 6", role: "Librarian" },
  ];

  return (
    <div className="h-[calc(100%-2rem)] my-4 overflow-y-auto pl-2 custom-scrollbar" style={{ direction: "rtl" }}>
      <div className="space-y-3 mb-6" style={{ direction: "ltr" }}>
        <h2 className="text-2xl font-bold tracking-tight">Our Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {teamMembers.map((member) => (
            <Card key={member.name} className="overflow-hidden hover:shadow-md transition-all">
              <div className="aspect-[5/4.5] relative bg-muted flex items-center justify-center">
                {member.imageSrc ? (
                  <Image
                    src={member.imageSrc}
                    alt={member.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="text-sm font-semibold leading-tight">{member.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{member.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getPatronProfile();
  
  if (!profile) {
    redirect('/login');
  }
  
  return (
    <DashboardInteractiveShell 
      profile={profile} 
      rulesView={<RulesView />} 
      teamView={<TeamView />} 
    />
  );
}
