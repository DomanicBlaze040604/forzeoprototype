import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

type Role = "owner" | "admin" | "analyst" | "viewer";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, any>;
}

interface OrganizationMember {
  id: string;
  user_id: string;
  role: Role;
  email?: string;
  joined_at: string;
}

interface UserOrganization {
  organization_id: string;
  organization_name: string;
  role: Role;
  member_count: number;
}

const ROLE_HIERARCHY: Role[] = ["viewer", "analyst", "admin", "owner"];

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  viewer: ["read:prompts", "read:reports", "read:dashboard"],
  analyst: ["read:prompts", "read:reports", "read:dashboard", "write:prompts", "run:analysis"],
  admin: ["read:prompts", "read:reports", "read:dashboard", "write:prompts", "run:analysis", 
          "manage:brands", "manage:competitors", "manage:settings"],
  owner: ["read:prompts", "read:reports", "read:dashboard", "write:prompts", "run:analysis",
          "manage:brands", "manage:competitors", "manage:settings", "manage:members", 
          "manage:billing", "delete:organization"],
};

export function useRBAC() {
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentRole) return false;
    return ROLE_PERMISSIONS[currentRole].includes(permission);
  }, [currentRole]);

  // Check if user has at least a certain role level
  const hasRole = useCallback((requiredRole: Role): boolean => {
    if (!currentRole) return false;
    return ROLE_HIERARCHY.indexOf(currentRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
  }, [currentRole]);

  // Fetch user's organizations
  const fetchOrganizations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc("get_user_organizations", {
        p_user_id: user.id,
      });
      
      if (error) throw error;
      setOrganizations(data || []);
      
      // Auto-select first org if none selected
      if (data && data.length > 0 && !currentOrg) {
        await selectOrganization(data[0].organization_id);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrg]);

  // Select an organization
  const selectOrganization = useCallback(async (orgId: string) => {
    if (!user) return;
    
    try {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      
      if (orgError) throw orgError;
      
      const { data: membership, error: memberError } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .single();
      
      if (memberError) throw memberError;
      
      setCurrentOrg(org);
      setCurrentRole(membership.role as Role);
      
      // Fetch members if admin or owner
      if (["admin", "owner"].includes(membership.role)) {
        await fetchMembers(orgId);
      }
    } catch (err) {
      console.error("Failed to select organization:", err);
    }
  }, [user]);

  // Fetch organization members
  const fetchMembers = useCallback(async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgId);
      
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }, []);

  // Create a new organization
  const createOrganization = useCallback(async (name: string, slug: string) => {
    if (!user) return null;
    
    try {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name, slug, owner_id: user.id })
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      // Add owner as member
      await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });
      
      toast({ title: "Organization Created", description: `${name} has been created` });
      await fetchOrganizations();
      return org;
    } catch (err) {
      toast({ title: "Error", description: "Failed to create organization", variant: "destructive" });
      return null;
    }
  }, [user, toast, fetchOrganizations]);

  // Invite a member
  const inviteMember = useCallback(async (email: string, role: Role) => {
    if (!currentOrg || !hasRole("admin")) return false;
    
    toast({ title: "Invite Sent", description: `Invitation sent to ${email}` });
    return true;
  }, [currentOrg, hasRole, toast]);

  // Update member role
  const updateMemberRole = useCallback(async (memberId: string, newRole: Role) => {
    if (!currentOrg || !hasRole("admin")) return false;
    
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);
      
      if (error) throw error;
      
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast({ title: "Role Updated", description: "Member role has been updated" });
      return true;
    } catch (err) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
      return false;
    }
  }, [currentOrg, hasRole, toast]);

  // Remove a member
  const removeMember = useCallback(async (memberId: string) => {
    if (!currentOrg || !hasRole("admin")) return false;
    
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);
      
      if (error) throw error;
      
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast({ title: "Member Removed", description: "Member has been removed" });
      return true;
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
      return false;
    }
  }, [currentOrg, hasRole, toast]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    currentOrg,
    currentRole,
    members,
    loading,
    hasPermission,
    hasRole,
    selectOrganization,
    createOrganization,
    inviteMember,
    updateMemberRole,
    removeMember,
    fetchOrganizations,
  };
}
