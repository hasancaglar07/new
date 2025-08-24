import { generateMetadata } from './metadata';
import ChatSlugClient from './ChatSlugClient';

// Metadata export for SEO
export { generateMetadata };

export default function ChatSlugPage({ params }) {
  return <ChatSlugClient params={params} />;
}