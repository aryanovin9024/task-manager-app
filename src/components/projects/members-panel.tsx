import { AddMemberForm } from '@/components/projects/add-member-form';
import { RemoveMemberButton } from '@/components/projects/remove-member-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { ProjectDetail } from '@/server/types';

/** Two letters for the avatar: initials of the display name, else the username. */
function initialsOf(displayName: string, username: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return username.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** The people on a project, plus the owner's controls for changing them. */
export function MembersPanel({ project, viewerId }: { project: ProjectDetail; viewerId: string }) {
  const count = project.members.length;

  return (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          {count} {count === 1 ? 'person' : 'people'} on this project.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="-mx-2 flex flex-col">
          {project.members.map((member) => (
            <li
              key={member.id}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Avatar>
                <AvatarFallback>{initialsOf(member.displayName, member.username)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{member.displayName}</span>
                  {member.role === 'OWNER' ? <Badge variant="secondary">OWNER</Badge> : null}
                  {member.id === viewerId ? <Badge variant="outline">You</Badge> : null}
                </div>
                <p className="text-muted-foreground truncate text-xs">@{member.username}</p>
              </div>

              {project.isOwner && member.role !== 'OWNER' ? (
                <RemoveMemberButton projectId={project.id} member={member} />
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardContent>
        <Separator className="mb-4" />
        {project.isOwner ? (
          <AddMemberForm projectId={project.id} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Only the project owner can add or remove people.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
