/**
 * The web build's appendFile (see form-file.ts): the picker hands back a File, or a blob:
 * URI that is fetched into one.
 */
export type PickedFile = { uri: string; name: string; type: string; file?: File | null };

export async function appendFile(form: FormData, field: string, f: PickedFile) {
  const file = f.file ?? new File([await (await fetch(f.uri)).blob()], f.name, { type: f.type });
  form.append(field, file, f.name);
}
