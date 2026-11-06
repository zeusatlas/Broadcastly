import { useAuthStore } from '@/features/auth';
import {
  useRemoveOrganisationLogoMutation,
  useUploadOrganisationLogoMutation,
} from '@/features/organisation';
import { notify } from '@/lib/notify';
import { pickLogoForm } from '@/utils/media';

// The head's logo is the organisation's: every executive in it, at any level, gets it on /auth/me.
export function useOrganisationLogo() {
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const upload = useUploadOrganisationLogoMutation();
  const remove = useRemoveOrganisationLogoMutation();

  const pickAndUpload = async () => {
    const form = await pickLogoForm();
    if (!form) return;
    const response = await upload.mutate(form);
    if (!response) {
      notify.error('Logo not updated', 'Use a PNG, JPEG or WebP image up to 2 MB.');
      return;
    }
    await refreshUser();
    notify.success('Logo updated', 'Everyone in your organisation will see it.');
  };

  const removeLogo = async () => {
    const response = await remove.mutate(undefined);
    if (!response) {
      notify.error('Logo not removed', 'Check your connection and try again.');
      return false;
    }
    await refreshUser();
    notify.success('Logo removed');
    return true;
  };

  return { pickAndUpload, removeLogo, isUploading: upload.isPending, isRemoving: remove.isPending };
}
