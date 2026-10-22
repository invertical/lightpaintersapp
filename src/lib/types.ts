/**
 * The v2 API's shapes, as the app reads them (app/Api/V2/Resources in the Laravel repo).
 * Fields marked "requested" were asked of the API session and may not be live yet; the
 * screens treat them as optional.
 */

export type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  location: string | null;
  avatarUrl: string | null;
  profileUrl: string;
  isMember: boolean;
  showsAdultContent: boolean;
  isAdmin: boolean;
  impersonator: { id: number; name: string } | null;
  /** Requested. */
  profileGalleryId?: number | null;
  canSubmitLinks?: boolean;
  canAddEvents?: boolean;
  canCreateOrgs?: boolean;
};

export type Person = {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  profileUrl: string;
  /** Requested. */
  country?: string | null;
  city?: string | null;
};

export type Image = { variant: string; format: string; url: string; width: number; height: number };

export type Picture = {
  id: number;
  galleryId: number;
  title: string | null;
  description: string | null;
  isAdult: boolean;
  blurred: boolean;
  width: number;
  height: number;
  images: Image[];
  owner?: Person;
  pageUrl: string;
  createdAt: string;
};

export type TagType = { slug: string; name: string; isPeople: boolean; roles: string[] };

export type Tag = { id: number; name: string; slug: string; type: TagType; useCount?: number };

export type TagApplication = { tag: Tag; role: string | null; status: string };

export type ProfileLink = { id?: number; type: string; url: string; label?: string | null };

export type Profile = Person & {
  firstName: string;
  lastName: string;
  location: string | null;
  links: ProfileLink[];
  tags: TagApplication[];
  portfolioGalleryId: number | null;
  isMember: boolean;
  memberSince: string | null;
  /** Requested. */
  otherName?: string | null;
  description?: string | null;
  orgs?: OrgSummary[];
  feedPostCount?: number;
  canMessage?: boolean;
  isMe?: boolean;
};

export type MyProfile = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  otherName: string | null;
  bio: string | null;
  pictureId: number | null;
  avatarUrl: string | null;
  countryId: number | null;
  stateId: number | null;
  city: string | null;
  location: string | null;
  tags: Record<string, TagApplication[]>;
  profileUrl: string;
};

export type Gallery = {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  pictureCount: number;
  cover: Picture | null;
  pageUrl: string;
};

export type FeedPost = {
  id: number;
  author: Person;
  subject: string | null;
  text: string;
  isAdult: boolean;
  processingLevel: { value: number; label: string } | null;
  pictures: Picture[];
  tags: TagApplication[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  pageUrl: string;
  createdAt: string;
  /** Requested. */
  canDelete?: boolean;
};

export type Comment = {
  id: number;
  author: Person;
  text: string;
  createdAt: string;
  canDelete?: boolean;
};

export type OrgSummary = { id: number; slug: string; name: string };

export type Org = OrgSummary & {
  description: string | null;
  logoUrl: string | null;
  memberCount?: number;
  pageUrl: string;
  /** Requested. */
  imageUrl?: string | null;
  followerCount?: number;
  links?: ProfileLink[];
  isFollowing?: boolean;
  isMember?: boolean;
  canManage?: boolean;
  manageUrl?: string | null;
};

export type EventItem = {
  id: number;
  name: string;
  type: string | null;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  venue: string | null;
  city: string;
  country: string | null;
  imageUrl: string | null;
  org: OrgSummary | null;
  pageUrl: string;
  /** Requested. */
  subtitle?: string | null;
  summary?: string | null;
  online?: boolean;
  url?: string | null;
};

export type EventType = { id: number; slug: string; name: string; description?: string | null; upcomingCount?: number };

export type LinkSection = { id: number; slug: string; name: string; description?: string | null; linkCount?: number };

export type DirectoryLink = { id: number; name: string; url: string; description: string | null; createdAt?: string };

export type Country = { id: number; name: string; hasStates: boolean; stateLabel: string };

export type State = { id: number; name: string };

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  icon: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  editedAt: string | null;
  sender: { id: number | null; name: string; isMine: boolean };
};

export type Chat = {
  id: number;
  type: string;
  with: Person | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  blocked: boolean;
  canPost: boolean;
  lastActivityAt: string | null;
};
