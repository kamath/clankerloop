import ProblemRender from "./components/problem-render";

export default async function Page({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = await params;
  return <ProblemRender problemId={problemId} />;
}
