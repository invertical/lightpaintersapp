import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Check, LayoutDashboard, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { EventRow } from '@/components/event-row';
import { LinkChips } from '@/components/link-chips';
import { PersonRow } from '@/components/person-row';
import { Avatar, Button, ErrorLine, ErrorState, Loading, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Spacing } from '@/constants/theme';
import { apiFetch, errorMessage, type Page } from '@/lib/api';
import { openUrl } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { EventItem, Org, Person } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useMeasuredWidth } from '@/lib/use-measured-width';

/**
 * An org, as on its website page: the image, name, members and followers, its links,
 * Follow (and Dashboard for its managers — a web page for now), the description,
 * upcoming events and its members. Membership and donations are not in the app yet.
 */
export default function OrgScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const org = useApi<{ data: Org }>(`/groups/${encodeURIComponent(slug)}`);
  const o = org.data?.data;

  return (
    <Chrome>
      <ScreenTitle title={o?.name ?? 'Organization'} />
      {org.error ? (
        <ErrorState error={org.error} onRetry={org.reload} />
      ) : !o ? (
        <Loading />
      ) : (
        <OrgBody org={o} onChange={(next) => org.setData({ data: next })} />
      )}
    </Chrome>
  );
}

function OrgBody({ org, onChange }: { org: Org; onChange: (org: Org) => void }) {
  const { token } = useSession();
  const { width, onLayout } = useMeasuredWidth();
  const events = useApi<Page<EventItem>>(`/events?orgId=${org.id}&perPage=20`);
  // 404 when the org hides its members: then the section is left out.
  const members = useApi<Page<Person>>(`/groups/${encodeURIComponent(org.slug)}/members?perPage=100`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hero = org.imageUrl ?? null;

  async function toggleFollow() {
    setBusy(true);
    setError(null);
    const following = !!org.isFollowing;
    try {
      await apiFetch(`/me/group-follows/${org.id}`, { method: following ? 'DELETE' : 'PUT', token });
      onChange({
        ...org,
        isFollowing: !following,
        followerCount: org.followerCount === undefined ? undefined : org.followerCount + (following ? -1 : 1),
      });
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(false);
  }

  const counts = [
    org.memberCount !== undefined ? `${org.memberCount} member${org.memberCount === 1 ? '' : 's'}` : null,
    org.followerCount !== undefined ? `${org.followerCount} follower${org.followerCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View onLayout={onLayout} />
      {hero ? (
        <Image
          source={{ uri: hero }}
          style={{ width, height: width * 0.6, backgroundColor: Colors.card }}
          contentFit="contain"
          accessibilityLabel={`${org.name} logo`}
        />
      ) : null}

      <View style={styles.section}>
        <View style={styles.identity}>
          {/* The large logo leads the page when there is one; otherwise a placeholder. */}
          {!hero ? <Avatar url={org.logoUrl} size={64} square /> : null}
          <View style={styles.names}>
            <Text style={styles.name} accessibilityRole="header">
              {org.name}
            </Text>
            {counts.length > 0 ? <Text style={ui.muted}>{counts.join(' · ')}</Text> : null}
          </View>
        </View>

        <LinkChips links={org.links ?? []} />

        <View style={styles.controls}>
          <Button
            label={org.isFollowing ? 'Following' : 'Follow'}
            icon={org.isFollowing ? Check : Plus}
            size="sm"
            variant={org.isFollowing ? 'secondary' : 'primary'}
            busy={busy}
            onPress={toggleFollow}
          />
          {org.canManage && org.manageUrl ? (
            <Button
              label="Dashboard"
              icon={LayoutDashboard}
              size="sm"
              variant="secondary"
              onPress={() => openUrl(org.manageUrl!)}
            />
          ) : null}
        </View>
        <ErrorLine error={error} />

        {org.description ? <Text style={ui.body}>{org.description}</Text> : null}
      </View>

      <Text style={[styles.sectionTitle, styles.section]} accessibilityRole="header">
        Upcoming events
      </Text>
      {events.loading ? (
        <Loading />
      ) : (events.data?.data ?? []).length === 0 ? (
        <Text style={[ui.muted, styles.section]}>No upcoming events.</Text>
      ) : (
        <View>
          {events.data!.data.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </View>
      )}

      {members.error ? null : (
        <>
          <Text style={[styles.sectionTitle, styles.section]} accessibilityRole="header">
            Members
          </Text>
          {members.loading ? (
            <Loading />
          ) : (members.data?.data ?? []).length === 0 ? (
            <Text style={[ui.muted, styles.section]}>No members listed.</Text>
          ) : (
            <View>
              {members.data!.data.map((m) => (
                <PersonRow key={m.id} person={m} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.xxl, gap: Spacing.md },
  section: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md },
  names: { flex: 1, gap: 2 },
  name: { color: Colors.foreground, fontSize: Font.xl, fontWeight: '800' },
  controls: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  sectionTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '800', marginTop: Spacing.md },
});
