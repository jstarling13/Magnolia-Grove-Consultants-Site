import PageSkeleton from "@/components/PageSkeleton";

// See account/loading.tsx for why loading skeletons live on the server-rendered routes only.
export default function Loading() {
  return <PageSkeleton />;
}
