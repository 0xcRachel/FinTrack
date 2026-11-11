import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Mail, UserMinus, UserPlus, UserRound, Users } from 'lucide-react';
import { apiDelete, apiGet, apiPost, ApiRequestError } from '../../lib/api';
import { workspaceName } from '../../lib/workspaces';
import type { Language } from '../../lib/i18n';
import type { WorkspaceDto, WorkspaceMemberDto, WorkspaceType } from '../../types/api';
import { Dialog } from './Dialog';
import { useToast } from '../ui/ToastProvider';
import { useErrorToast } from '../ui/useErrorToast';
import { useConfirm } from '../ui/ConfirmProvider';

export function CreateWorkspaceDialog({ currentLang, onClose, onCreated }: {
  currentLang: Language;
  onClose: () => void;
  onCreated: (workspace: WorkspaceDto) => void;
}) {
  const vi = currentLang === 'vi';
  const notify = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<WorkspaceType>('FAMILY');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const workspace = await apiPost<WorkspaceDto>('/workspaces', { name: trimmed, type });
      notify.success(vi ? `Đã tạo không gian “${workspace.name}”.` : `Created “${workspace.name}”.`);
      onCreated(workspace);
      onClose();
    } catch {
      notify.error(vi ? 'Chưa thể tạo không gian. Vui lòng thử lại.' : 'Could not create the space. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog title={vi ? 'Tạo không gian mới' : 'Create a new space'} onClose={onClose} closeLabel={vi ? 'Đóng' : 'Close'}>
    <form className="ft-space-form" onSubmit={submit}>
      <div className="ft-space-form-intro">
        <span className="ft-space-form-icon"><Users size={22} strokeWidth={1.6} /></span>
        <p>{vi ? 'Mỗi không gian có danh mục, tài khoản, ngân sách và mục tiêu riêng.' : 'Each space keeps its own accounts, categories, budgets, and goals.'}</p>
      </div>
      <label className="ft-space-field">
        <span>{vi ? 'Tên không gian' : 'Space name'}</span>
        <input value={name} onChange={event => setName(event.target.value)} maxLength={60} autoFocus
          placeholder={vi ? 'Ví dụ: Gia đình mình' : 'e.g. Our family'} />
      </label>
      <div className="ft-space-field">
        <span>{vi ? 'Loại không gian' : 'Space type'}</span>
        <div className="ft-space-types" role="radiogroup" aria-label={vi ? 'Loại không gian' : 'Space type'}>
          <button type="button" role="radio" aria-checked={type === 'PERSONAL'}
            className={`ft-space-type ${type === 'PERSONAL' ? 'is-selected' : ''}`} onClick={() => setType('PERSONAL')}>
            <span className="ft-space-type-icon"><UserRound size={18} strokeWidth={1.7} /></span>
            <span><b>{vi ? 'Cá nhân' : 'Personal'}</b><small>{vi ? 'Một không gian riêng cho kế hoạch khác của bạn.' : 'A private space for another part of your life.'}</small></span>
          </button>
          <button type="button" role="radio" aria-checked={type === 'FAMILY'}
            className={`ft-space-type ${type === 'FAMILY' ? 'is-selected' : ''}`} onClick={() => setType('FAMILY')}>
            <span className="ft-space-type-icon"><Users size={18} strokeWidth={1.7} /></span>
            <span><b>{vi ? 'Gia đình' : 'Family'}</b><small>{vi ? 'Chia sẻ tài chính với người thân trong cùng một nơi.' : 'Share finances with the people at home.'}</small></span>
          </button>
        </div>
      </div>
      <p className="ft-space-form-note">
        {type === 'FAMILY'
          ? (vi ? 'Sau khi tạo, bạn có thể mời thành viên bằng email từ menu không gian.' : 'After creating it, invite members by email from the space menu.')
          : (vi ? 'Chỉ bạn nhìn thấy và sử dụng không gian này.' : 'Only you can see and use this space.')}
      </p>
      <div className="ft-space-form-actions">
        <button type="button" className="ft-btn ft-btn-secondary" onClick={onClose}>{vi ? 'Hủy' : 'Cancel'}</button>
        <button type="submit" className="ft-btn ft-btn-primary" disabled={!name.trim() || saving}>
          {saving && <Loader2 size={16} className="ft-spin" />}
          {saving ? (vi ? 'Đang tạo…' : 'Creating…') : (vi ? 'Tạo không gian' : 'Create space')}
        </button>
      </div>
    </form>
  </Dialog>;
}

export function WorkspaceMembersDialog({ workspace, currentLang, onClose }: {
  workspace: WorkspaceDto;
  currentLang: Language;
  onClose: () => void;
}) {
  const vi = currentLang === 'vi';
  const notify = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const isOwner = workspace.role === 'OWNER';
  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspace.workspaceId],
    queryFn: ({ signal }) => apiGet<WorkspaceMemberDto[]>(`/workspaces/${workspace.workspaceId}/members`, signal),
    retry: 1,
  });
  useErrorToast(membersQuery.isError,
    vi ? 'Chưa thể tải thành viên. Hãy thử lại.' : 'Could not load members. Please try again.');

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['workspace-members', workspace.workspaceId] });
    void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  };

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = email.trim();
    if (!address || adding) return;
    setAdding(true);
    try {
      await apiPost<WorkspaceMemberDto>(`/workspaces/${workspace.workspaceId}/members`, { email: address });
      setEmail('');
      refresh();
      notify.success(vi ? 'Đã thêm thành viên vào không gian.' : 'Member added to the space.');
    } catch (error) {
      const message = error instanceof ApiRequestError && error.status === 404
        ? (vi ? 'Không tìm thấy tài khoản FinTrack với email này.' : 'No FinTrack account uses this email.')
        : error instanceof ApiRequestError && error.status === 400
          ? (vi ? 'Người này đã là thành viên của không gian.' : 'This person is already a member.')
          : (vi ? 'Chưa thể thêm thành viên.' : 'Could not add this member.');
      notify.error(message);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (member: WorkspaceMemberDto) => {
    const confirmed = await confirm({
      title: vi ? 'Xóa thành viên?' : 'Remove member?',
      description: vi ? `${member.fullName} sẽ mất quyền truy cập không gian này. Dữ liệu vẫn được giữ nguyên.`
        : `${member.fullName} will lose access to this space. The data stays intact.`,
      confirmLabel: vi ? 'Xóa khỏi không gian' : 'Remove',
      cancelLabel: vi ? 'Hủy' : 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    setRemovingId(member.memberId);
    try {
      await apiDelete<void>(`/workspaces/${workspace.workspaceId}/members/${member.memberId}`);
      refresh();
      notify.success(vi ? 'Đã xóa thành viên khỏi không gian.' : 'Member removed from the space.');
    } catch {
      notify.error(vi ? 'Chưa thể xóa thành viên.' : 'Could not remove this member.');
    } finally {
      setRemovingId(null);
    }
  };

  const members = membersQuery.data ?? [];

  return <Dialog title={vi ? `Thành viên · ${workspaceName(workspace, vi)}` : `Members · ${workspaceName(workspace, vi)}`}
    onClose={onClose} closeLabel={vi ? 'Đóng' : 'Close'}>
    <div className="ft-members">
      <p className="ft-members-intro">
        {vi ? 'Thành viên có thể xem và cập nhật mọi dữ liệu trong không gian này.'
          : 'Members can view and update everything in this space.'}
      </p>
      {isOwner ? <form className="ft-member-invite" onSubmit={invite}>
        <div className="ft-member-invite-field">
          <Mail size={16} />
          <input type="email" value={email} onChange={event => setEmail(event.target.value)}
            placeholder={vi ? 'Email của người bạn muốn mời' : 'Email of the person to invite'}
            aria-label={vi ? 'Email thành viên mới' : 'New member email'} />
        </div>
        <button type="submit" className="ft-btn ft-btn-primary" disabled={!email.trim() || adding}>
          {adding ? <Loader2 size={16} className="ft-spin" /> : <UserPlus size={16} />}
          {adding ? (vi ? 'Đang thêm…' : 'Adding…') : (vi ? 'Thêm' : 'Invite')}
        </button>
      </form> : <p className="ft-members-readonly">
        {vi ? 'Chỉ chủ không gian có thể mời hoặc xóa thành viên.' : 'Only the space owner can invite or remove members.'}
      </p>}
      <div className="ft-member-list">
        {membersQuery.isLoading && <div className="ft-members-loading"><Loader2 size={18} className="ft-spin" />{vi ? 'Đang tải thành viên…' : 'Loading members…'}</div>}
        {!membersQuery.isLoading && members.map(member => <div className="ft-member-row" key={member.memberId}>
          <span className="ft-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.fullName.slice(0, 1).toUpperCase()}</span>
          <div className="ft-member-copy">
            <b>{member.fullName}</b>
            <small>{member.email}</small>
          </div>
          <span className={`ft-member-role ${member.role === 'OWNER' ? 'is-owner' : ''}`}>
            {member.role === 'OWNER' ? (vi ? 'Chủ không gian' : 'Owner') : (vi ? 'Thành viên' : 'Member')}
          </span>
          {isOwner && member.role === 'MEMBER' && <button type="button" className="ft-icon-btn ft-member-remove"
            aria-label={vi ? `Xóa ${member.fullName}` : `Remove ${member.fullName}`} title={vi ? 'Xóa thành viên' : 'Remove member'}
            disabled={removingId === member.memberId} onClick={() => remove(member)}>
            {removingId === member.memberId ? <Loader2 size={16} className="ft-spin" /> : <UserMinus size={16} />}
          </button>}
        </div>)}
        {!membersQuery.isLoading && members.length === 0 && <p className="ft-members-empty">{vi ? 'Chưa có thành viên nào.' : 'No members yet.'}</p>}
      </div>
    </div>
  </Dialog>;
}
