export type RoleChoice = {
  id: string;
  key: string;
  name: string;
  description: string;
  permissionKeys: string[];
  assignable: boolean;
};
export type MemberView = {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
  roles: string[];
  status: "ACTIVE" | "SUSPENDED" | "REMOVED";
  updatedAt: string;
  protected: boolean;
  current: boolean;
};
export type InvitationView = {
  id: string;
  email: string;
  roles: string[];
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  updatedAt: string;
  inviter: string;
};
export type MemberList = {
  members: MemberView[];
  total: number;
  page: number;
  counts: {
    active: number;
    suspended: number;
    removed: number;
    pending: number;
  };
};
