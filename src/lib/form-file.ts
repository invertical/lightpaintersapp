/**
 * Add a picked photo or video to a multipart form. On a phone, React Native's FormData
 * takes `{ uri, name, type }` and streams the file from disk; the web build
 * (form-file.web.ts) needs a real File instead.
 */
export type PickedFile = { uri: string; name: string; type: string; file?: File | null };

export async function appendFile(form: FormData, field: string, f: PickedFile) {
  // React Native's FormData accepts this shape; the DOM typing doesn't know it.
  form.append(field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
}
