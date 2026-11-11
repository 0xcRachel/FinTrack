import type { WorkspaceDto } from '../types/api';

export function workspaceName(workspace: WorkspaceDto, vi: boolean): string {
  if (workspace.isDefault && workspace.type === 'PERSONAL') {
    return vi ? 'Không gian cá nhân' : 'Personal workspace';
  }
  return workspace.name;
}

export function workspaceTypeLabel(workspace: WorkspaceDto, vi: boolean): string {
  if (workspace.type === 'FAMILY') return vi ? 'Gia đình' : 'Family';
  return vi ? 'Cá nhân' : 'Personal';
}

export function workspaceMeta(workspace: WorkspaceDto, vi: boolean): string {
  const members = workspace.memberCount === 1
    ? (vi ? '1 thành viên' : '1 member')
    : (vi ? `${workspace.memberCount} thành viên` : `${workspace.memberCount} members`);
  return `${workspaceTypeLabel(workspace, vi)} · ${members}`;
}

export function workspaceInitial(workspace: WorkspaceDto | null, vi: boolean): string {
  const name = workspace ? workspaceName(workspace, vi) : vi ? 'Không gian cá nhân' : 'Personal';
  return name.trim().charAt(0).toUpperCase() || 'F';
}
