import { Redirect } from 'expo-router';

/** Home is the feed. */
export default function Home() {
  return <Redirect href="/feed" />;
}
