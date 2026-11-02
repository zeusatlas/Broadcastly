// Placeholder home until the first real screen lands. Uses only theme tokens.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-card-foreground">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-emphasis">Broadcastly</p>
        <h1 className="mt-2 text-2xl font-bold">Official communication for party executives</h1>
        <p className="mt-3 text-muted-foreground">The web app is being set up.</p>
        <span className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Coming soon
        </span>
      </div>
    </main>
  );
}
