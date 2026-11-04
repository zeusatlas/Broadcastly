import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { PageScreen } from '@/components/shared';
import { SearchField, Text } from '@/components/ui';

import { ApprovalRow } from '../components/ApprovalRow';
import { DEMO_APPROVALS, type ApprovalItem } from '../demo_data';
import { ApprovalDetailSheet } from './ApprovalDetailSheet';

export function ApprovalSearchScreen() {
  const [search, setSearch] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null);
  const query = search.trim().toLowerCase();
  const approvals = useMemo(
    () =>
      DEMO_APPROVALS.filter(
        (approval) =>
          approval.title.toLowerCase().includes(query) ||
          approval.audience.toLowerCase().includes(query) ||
          approval.creator.toLowerCase().includes(query),
      ),
    [query],
  );

  return (
    <PageScreen backIcon={X} backLabel="Close search">
      <View className="gap-4">
        <SearchField
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search approvals"
          className="h-14"
        />
        <Text variant="caption">
          {approvals.length} {approvals.length === 1 ? 'approval' : 'approvals'} found
        </Text>
        <View>
          {approvals.length > 0 ? (
            approvals.map((approval, index) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                isLast={index === approvals.length - 1}
                onPress={() => setSelectedApproval(approval)}
              />
            ))
          ) : (
            <View className="items-center gap-2 py-16">
              <Text variant="heading">No approvals found</Text>
              <Text variant="bodyMuted" className="text-center">
                Try a different title, audience or creator.
              </Text>
            </View>
          )}
        </View>
      </View>
      <ApprovalDetailSheet
        approval={selectedApproval}
        onClose={() => setSelectedApproval(null)}
      />
    </PageScreen>
  );
}
