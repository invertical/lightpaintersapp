import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ImagePlus } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Chrome } from '@/components/chrome';
import { Select, type Option } from '@/components/select';
import { Button, Card, ErrorLine, Field, ScreenTitle, ui } from '@/components/ui';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';
import { apiUpload, errorMessage, fieldError, type Page } from '@/lib/api';
import { openUrl, pickPhotos } from '@/lib/format';
import { appendFile, type PickedFile } from '@/lib/form-file';
import { useSession } from '@/lib/session';
import type { Country, EventItem, EventType, Org } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function deviceZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function zoneOptions(): Option<string>[] {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  const zones = supported ? supported('timeZone') : [deviceZone(), 'UTC'];
  return [...new Set([deviceZone(), ...zones])].map((z) => ({ value: z, label: z.replace(/_/g, ' ') }));
}

/**
 * List an event (the website's /events/new/{type}): what, when, where and details. Times
 * are in the event's own time zone. Informational only: no tickets. A member perk, like
 * on the website; it is public at once and staff can pull it.
 */
export default function NewEvent() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const { token, user } = useSession();
  const types = useApi<{ data: EventType[] }>('/event-types');
  const countries = useApi<{ data: Country[] }>('/countries');
  const myOrgs = useApi<Page<Org>>('/me/groups?relation=manager&perPage=100');
  const zones = useMemo(() => zoneOptions(), []);

  const [typeId, setTypeId] = useState<number | null>(null);
  const [f, setF] = useState({
    name: '',
    subtitle: '',
    summary: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    onlineLink: '',
    venue: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    mapLink: '',
    locationInstructions: '',
    hostedBy: '',
    cost: '',
    url: '',
    facebook: '',
    youtube: '',
    contactName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    contactEmail: user?.email ?? '',
    contactPhone: '',
  });
  const [timeZone, setTimeZone] = useState(deviceZone());
  const [online, setOnline] = useState(false);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<number>(0);
  const [image, setImage] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const chosenType = typeId ?? types.data?.data.find((t) => t.slug === type)?.id ?? null;
  const set = (key: keyof typeof f) => (value: string) => setF((prev) => ({ ...prev, [key]: value }));
  const err = (key: string) => fieldError(error, key);

  if (user?.canAddEvents === false) {
    return (
      <Chrome>
        <ScreenTitle title="Submit an event" />
        <View style={ui.page}>
          <Card>
            <Text style={ui.body}>Listing events is for LightPainters members.</Text>
          </Card>
        </View>
      </Chrome>
    );
  }

  async function submit() {
    setProblem(null);
    if (!chosenType) return setProblem('Choose the kind of event.');
    if (!f.name.trim()) return setProblem('Give the event a name.');
    if (!DATE.test(f.startDate) || !TIME.test(f.startTime)) return setProblem('Enter when it starts, like 2026-11-14 and 19:00.');
    if ((f.endDate || f.endTime) && (!DATE.test(f.endDate) || !TIME.test(f.endTime))) {
      return setProblem('Enter when it ends, like 2026-11-14 and 22:00, or leave both empty.');
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      const fields: Record<string, string> = {
        typeId: String(chosenType),
        timeZone,
        starts: `${f.startDate}T${f.startTime}`,
        ends: f.endDate ? `${f.endDate}T${f.endTime}` : '',
        online: online ? '1' : '0',
        countryId: countryId ? String(countryId) : '',
        orgId: orgId ? String(orgId) : '',
      };
      for (const [key, value] of Object.entries({ ...f, ...fields })) {
        if (key === 'startDate' || key === 'startTime' || key === 'endDate' || key === 'endTime') continue;
        form.append(key, typeof value === 'string' ? value.trim() : value);
      }
      if (image) await appendFile(form, 'image', image);
      const res = await apiUpload<{ data: EventItem }>('/events', form, { token });
      router.back();
      openUrl(res.data.pageUrl);
    } catch (e) {
      setError(e);
    }
    setBusy(false);
  }

  return (
    <Chrome>
      <ScreenTitle title="Submit an event" />
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Section title="What">
          <Select
            label="Kind of event"
            value={chosenType}
            options={(types.data?.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
            onChange={setTypeId}
            placeholder="Choose one"
          />
          <Field label="Name" value={f.name} onChangeText={set('name')} maxLength={255} error={err('name')} />
          <Field label="Subtitle (optional)" value={f.subtitle} onChangeText={set('subtitle')} maxLength={255} />
          <Field
            label="One-line summary (optional)"
            value={f.summary}
            onChangeText={set('summary')}
            maxLength={500}
            hint="Shown on event cards and link previews."
          />
          <Field label="Description" value={f.description} onChangeText={set('description')} multiline error={err('description')} />
          <Pressable accessibilityRole="button" onPress={async () => setImage((await pickPhotos())[0] ?? image)} style={styles.image}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
            ) : (
              <>
                <ImagePlus size={24} color={Colors.gold} />
                <Text style={ui.link}>Add an image (optional)</Text>
                <Text style={ui.muted}>Landscape works best.</Text>
              </>
            )}
          </Pressable>
        </Section>

        <Section title="When">
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Start date" value={f.startDate} onChangeText={set('startDate')} placeholder="YYYY-MM-DD" maxLength={10} error={err('starts')} />
            </View>
            <View style={styles.half}>
              <Field label="Start time" value={f.startTime} onChangeText={set('startTime')} placeholder="19:00" maxLength={5} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="End date (optional)" value={f.endDate} onChangeText={set('endDate')} placeholder="YYYY-MM-DD" maxLength={10} error={err('ends')} />
            </View>
            <View style={styles.half}>
              <Field label="End time" value={f.endTime} onChangeText={set('endTime')} placeholder="22:00" maxLength={5} />
            </View>
          </View>
          <Select label="Time zone" value={timeZone} options={zones} onChange={setTimeZone} />
        </Section>

        <Section title="Where">
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>This is an online event</Text>
            <Switch value={online} onValueChange={setOnline} trackColor={{ true: Colors.gold, false: Colors.cardRaised }} accessibilityLabel="This is an online event" />
          </View>
          {online ? (
            <Field label="Link to join" value={f.onlineLink} onChangeText={set('onlineLink')} placeholder="https://" autoCapitalize="none" keyboardType="url" error={err('onlineLink')} />
          ) : null}
          <Field label="Venue (optional)" value={f.venue} onChangeText={set('venue')} maxLength={150} />
          <Field label="Address" value={f.address1} onChangeText={set('address1')} maxLength={150} error={err('address1')} />
          <Field label="Address line 2 (optional)" value={f.address2} onChangeText={set('address2')} maxLength={150} />
          <Field label="City" value={f.city} onChangeText={set('city')} maxLength={150} error={err('city')} />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="State or region" value={f.state} onChangeText={set('state')} maxLength={150} />
            </View>
            <View style={styles.half}>
              <Field label="Postal code" value={f.zip} onChangeText={set('zip')} maxLength={25} />
            </View>
          </View>
          <Select
            label="Country"
            value={countryId}
            options={(countries.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            onChange={setCountryId}
            placeholder="Choose a country"
          />
          <Field label="Map link (optional)" value={f.mapLink} onChangeText={set('mapLink')} placeholder="https://" autoCapitalize="none" keyboardType="url" />
          <Field label="Getting there (optional)" value={f.locationInstructions} onChangeText={set('locationInstructions')} multiline />
        </Section>

        <Section title="Details">
          {(myOrgs.data?.data ?? []).length > 0 ? (
            <Select
              label="Organization (optional)"
              value={orgId}
              options={[{ value: 0, label: 'Not an organization event' }, ...myOrgs.data!.data.map((o) => ({ value: o.id, label: o.name }))]}
              onChange={setOrgId}
            />
          ) : null}
          <Field label="Hosted by (optional)" value={f.hostedBy} onChangeText={set('hostedBy')} maxLength={150} />
          <Field label="Cost (optional)" value={f.cost} onChangeText={set('cost')} maxLength={100} placeholder="Free, $20, pay what you can…" />
          <Field label="Event website (optional)" value={f.url} onChangeText={set('url')} placeholder="https://" autoCapitalize="none" keyboardType="url" error={err('url')} />
          <Field label="Facebook event (optional)" value={f.facebook} onChangeText={set('facebook')} placeholder="https://" autoCapitalize="none" keyboardType="url" />
          <Field label="YouTube video (optional)" value={f.youtube} onChangeText={set('youtube')} placeholder="https://" autoCapitalize="none" keyboardType="url" />
          <Field label="Contact name" value={f.contactName} onChangeText={set('contactName')} maxLength={150} />
          <Field label="Contact email" value={f.contactEmail} onChangeText={set('contactEmail')} autoCapitalize="none" keyboardType="email-address" maxLength={150} error={err('contactEmail')} />
          <Field label="Contact phone" value={f.contactPhone} onChangeText={set('contactPhone')} keyboardType="phone-pad" maxLength={30} />
        </Section>

        <ErrorLine error={problem ?? (error ? errorMessage(error) : null)} />
        <Button label="Submit event" onPress={submit} busy={busy} />
      </ScrollView>
    </Chrome>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg },
  sectionTitle: { color: Colors.foreground, fontSize: Font.lg, fontWeight: '800' },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  switchLabel: { color: Colors.foreground, fontSize: Font.base, flex: 1 },
  image: {
    minHeight: 120,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: 180 },
});
