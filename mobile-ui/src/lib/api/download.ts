import { File, Paths } from 'expo-file-system';

import { axiosClient } from './client';

// Through the shared client, so the bearer token, the one-time refresh on 401 and ApiError all apply.
export async function authorizedDownload(path: string, fileName: string): Promise<string> {
  const response = await axiosClient.get<string>(path, {
    responseType: 'text',
    headers: { Accept: '*/*' },
    transformResponse: (body: string) => body,
  });
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(response.data);
  return file.uri;
}
