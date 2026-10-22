# What the app needs from the v2 API

The app calls the LightPainters v2 API (`app/Api/V2` in the Laravel repo). This file
lists the endpoints and fields it uses that the API does **not** have yet (as of
2026-10-22), in the shapes the app is coded against. Where the API picks a different
shape, change the app to match (`src/lib/types.ts` holds the types).

Conventions are the API's own: problem+json errors, `{data, links, meta}` lists with
`?page` and `?perPage`, bearer tokens.

## Dev access

- CORS: allow any origin on `/v2` outside production (bearer tokens only, no credentials).
  The web build is served from `http://localhost:8012`.
- Accept `10.0.0.210:8181` as an API host, so phones on the LAN can reach it.

## Feed

- Feed items: `commentCount` and `createdAt` already exist.
- `GET /feed/{id}/comments`: paged, oldest first →
  `{id, author: PersonResource, text, createdAt, canDelete}`.
- `POST /feed/{id}/comments {text}` → 201 `{data: comment}`. A comment on my post
  notifies me.
- `DELETE /feed/{id}/comments/{commentId}`: allowed for the comment's author, the
  post's owner, and staff.
- `POST /feed`, multipart: `text`, `isAdult` ("1"/"0"), `pictures[]` (up to 10) →
  201 `{data: FeedPostResource}`. Same rules as `Livewire\Feed\Feed::post`.

## Artists

- `GET /people`: add `sort=name|created|lastAccess` (name ascending; the others
  newest first). `countryId` and `tag[]` already exist. PersonResource also needs
  `country` (name) and `city`.
- `GET /countries?withArtists=1`: only countries that have artists in them.
- `GET /tags?type=roles|techniques|subjects&perPage=100`: every live tag in the
  vocabulary.

## Profile

- `GET /people/{username}`: also return `otherName`, `description` (plain text),
  `orgs [{id, slug, name}]`, `feedPostCount`, `canMessage` and `isMe`.
- `GET /me`: also return `profileGalleryId`, `canSubmitLinks`, `canAddEvents` and
  `canCreateOrgs`.
- `PATCH /me/profile` already exists. The app sends `firstName`, `lastName`,
  `otherName`, `bio`, `pictureId`, `tags {slug: [names]}`, `countryId`, `stateId`,
  `city` and `username`.
- `GET /me/links` → `{data: [{id, typeId, type, url}], meta: {types: [{id, name}]}}`.
  `POST {typeId, url}`. `PATCH /me/links/{id} {typeId, url}`. `DELETE /me/links/{id}`.
  `PUT /me/links/order {ids: []}`. At most 20 links, as on `/account/links`.
- `PUT /galleries/{id}/order {pictureIds: []}`: the gallery manager may call it.

## Links

- `GET /link-sections` → `{data: [{id, slug, name, description, linkCount}]}`.
- `GET /links?section={slug}`: paged, approved links only, in the website's order →
  `{id, name, url, description}`.
- `POST /links {sectionId, name, url, description}` → 201, saved pending. Answer 403
  with a clear message when `canSubmitLinks` is false.

## Events

- `GET /event-types` → `{data: [{id, slug, name, description, upcomingCount}]}`.
- EventResource: add `subtitle`, `summary`, `online` and `url` (the event's own site).
- `POST /events`, multipart: `typeId`, `name`, `subtitle`, `summary`, `description`,
  `timeZone`, `starts`, `ends` (both `YYYY-MM-DDTHH:MM`, in `timeZone`), `online`,
  `onlineLink`, `venue`, `address1`, `address2`, `city`, `state`, `zip`, `countryId`,
  `mapLink`, `locationInstructions`, `hostedBy`, `cost`, `url`, `facebook`, `youtube`,
  `contactName`, `contactEmail`, `contactPhone`, `orgId`, `image` → 201
  `{data: EventResource}`. Same rules as `Livewire\Events\EditEvent`.
- `GET /me/groups?relation=manager`: the event form's org picker uses it.

## Organizations

- `GET /groups?sort=name`: alphabetical.
- `GET /groups/{slug}`: also return `imageUrl`, `followerCount`,
  `links [{type, url}]`, `isFollowing`, `isMember`, `canManage` and `manageUrl`.
- `POST /groups {name, slug?, description?, url?, requiresApproval?}` → 201
  `{data: OrgResource}`. Same rules as `Livewire\Orgs\CreateOrg`: requires
  `canCreateOrgs` (403 with a message otherwise) and uses `CreateOrgAction::slugRules()`.
  When `slug` is left out, suggest one from the name. The app suggests a slug as the
  person types; the server's rules decide.

## Email

Every account needs at least one confirmed email.

- `POST /me/emails {email}`: sends a code to an account with no email.
- `POST /me/emails/confirm {email, code}`: adds and confirms that address.
- The existing `/me/email-verification` and `/me/email-verification/confirm {code}`
  handle an account whose address is not yet confirmed.

## Social sign-in

- `POST /auth/oauth` already exists but is dormant. Enable it for Google, Apple and
  Facebook, reading their client ids from env, as Multipass does.
