import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRBAC } from "@/hooks/useRBAC";
import { 
  Building2, 
  Users, 
  Plus,
  Crown,
  Shield,
  Eye,
  BarChart3,
  MoreVertical,
  UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  analyst: BarChart3,
  viewer: Eye,
};

const ROLE_COLORS = {
  owner: "bg-yellow-100 text-yellow-800",
  admin: "bg-purple-100 text-purple-800",
  analyst: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-800",
};

export function OrganizationPanel() {
  const {
    organizations,
    currentOrg,
    currentRole,
    members,
    hasPermission,
    hasRole,
    selectOrganization,
    createOrganization,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useRBAC();
  
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", slug: "" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "analyst" | "admin">("viewer");

  const handleCreateOrg = async () => {
    if (!newOrg.name || !newOrg.slug) return;
    await createOrganization(newOrg.name, newOrg.slug);
    setNewOrg({ name: "", slug: "" });
    setShowCreate(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    await inviteMember(inviteEmail, inviteRole);
    setInviteEmail("");
    setShowInvite(false);
  };

  return (
    <div className="space-y-6">
      {/* Organization Selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newOrg.name}
                    onChange={(e) => setNewOrg(o => ({ ...o, name: e.target.value }))}
                    placeholder="My Company"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={newOrg.slug}
                    onChange={(e) => setNewOrg(o => ({ ...o, slug: e.target.value.toLowerCase().replace(/\s/g, "-") }))}
                    placeholder="my-company"
                  />
                </div>
                <Button onClick={handleCreateOrg} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations yet</p>
          ) : (
            <Select
              value={currentOrg?.id}
              onValueChange={selectOrganization}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.organization_id} value={org.organization_id}>
                    <div className="flex items-center gap-2">
                      <span>{org.organization_name}</span>
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                        {org.role}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {currentOrg && currentRole && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <span className="text-muted-foreground">Your role: </span>
                <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[currentRole]}`}>{currentRole}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      {currentOrg && hasRole("admin") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <Dialog open={showInvite} onOpenChange={setShowInvite}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-1" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        {hasRole("owner") && <SelectItem value="admin">Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleInvite} className="w-full">Send Invite</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => {
                const RoleIcon = ROLE_ICONS[member.role as keyof typeof ROLE_ICONS];
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {member.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{member.email || member.user_id}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <RoleIcon className="h-3 w-3" />
                          {member.role}
                        </div>
                      </div>
                    </div>
                    
                    {hasRole("admin") && member.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, "viewer")}>
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, "analyst")}>
                            Make Analyst
                          </DropdownMenuItem>
                          {hasRole("owner") && (
                            <DropdownMenuItem onClick={() => updateMemberRole(member.id, "admin")}>
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => removeMember(member.id)}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
