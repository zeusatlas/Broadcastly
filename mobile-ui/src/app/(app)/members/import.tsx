import { FileSpreadsheet } from 'lucide-react-native';

import { Placeholder } from '@/components/ui';

export default function MemberImportScreen() {
  return (
    <Placeholder
      title="Import members"
      description="Upload, preview, resolve duplicates and confirm a spreadsheet import (FR-MEM-02..08)."
      icon={FileSpreadsheet}
    />
  );
}
