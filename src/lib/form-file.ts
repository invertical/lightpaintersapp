import { File } from 'expo-file-system';

/**
 * Add a picked photo or video to a multipart form. On a phone the global fetch is
 * expo/fetch, which can't send React Native's `{ uri, name, type }` parts (it throws
 * "Unsupported FormDataPart implementation"); an expo-file-system File reads the bytes
 * itself. The web build (form-file.web.ts) needs a DOM File instead.
 */
export type PickedFile = { uri: string; name: string; type: string; file?: globalThis.File | null };

export async function appendFile(form: FormData, field: string, f: PickedFile) {
  // No filename argument: FormData.append would try to set `name`, which File only has a getter for.
  form.append(field, new File(f.uri));
}
