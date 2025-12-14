import Image from "next/image";

export type ListingStatus = "available" | "pending" | "rented";

export type ListingProps = {
  title: string;
  description: string;
  priceLabel?: string;
  imageUri?: string | null;
  ownerName?: string;
  status?: ListingStatus;
};

function statusBadgeClasses(status: ListingStatus) {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200";
    case "rented":
      return "bg-zinc-100 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-900 dark:text-zinc-200";
  }
}

export default function Listing({
  title,
  description,
  priceLabel,
  imageUri,
  ownerName,
  status = "available",
}: ListingProps) {
  const ownerInitials =
    ownerName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") ?? "U";

  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/[.145] dark:bg-black">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        {imageUri ? (
          <Image
            src={imageUri}
            alt={title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            unoptimized
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-zinc-200 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800" />
        )}

        <div className="absolute left-3 top-3">
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
              statusBadgeClasses(status),
            ].join(" ")}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-6 tracking-tight text-black dark:text-zinc-50">
            {title}
          </h3>
          {priceLabel ? (
            <div className="shrink-0 rounded-full bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-900 ring-1 ring-inset ring-black/8 dark:bg-zinc-900 dark:text-zinc-50 dark:ring-white/[.145]">
              {priceLabel}
            </div>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {ownerInitials}
            </div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {ownerName ?? "Unknown owner"}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}