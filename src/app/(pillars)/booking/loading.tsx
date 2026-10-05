import PageSkeleton from "@/components/PageSkeleton";

// Only server-rendered routes get a loading skeleton. A root-level loading.tsx would also wrap
// pages that call notFound() (the merchandise product and category routes), which makes Next send
// the response with HTTP 200 before notFound() runs and turns every bad URL into a soft 404.
export default function Loading() {
  return <PageSkeleton showHeaderBar={false} />;
}
