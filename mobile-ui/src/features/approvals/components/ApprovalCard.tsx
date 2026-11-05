import { Card, FigureRow } from '@/components/ui';

interface ApprovalCardProps {
  recipients: number;
  segments: number;
  credits: number;
  walletAvailable: number;
}

// The cost of approving, beside what the wallet holds: the one card on the approval sheet.
export function ApprovalCard({
  recipients,
  segments,
  credits,
  walletAvailable,
}: ApprovalCardProps) {
  return (
    <Card className="px-2">
      <FigureRow
        figures={[
          { label: 'Recipients', value: recipients },
          { label: 'Segments', value: segments },
          { label: 'Credits', value: credits },
          { label: 'Available', value: walletAvailable },
        ]}
      />
    </Card>
  );
}
