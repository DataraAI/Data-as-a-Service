import nvidiaLogoVertical from "@/assets/images/logo/nvidia-logo-vert.svg";

type NvidiaInceptionMemberProps = {
  className?: string;
  variant?: "hero" | "compact" | "logo-only";
};

export default function NvidiaInceptionMember({
  className = "",
  variant = "hero",
}: NvidiaInceptionMemberProps) {
  const isHero = variant === "hero";
  const isLogoOnly = variant === "logo-only";

  const logo = (
    <img
      src={nvidiaLogoVertical}
      alt={isLogoOnly ? "" : "NVIDIA"}
      className={
        isHero
          ? "h-14 w-auto object-contain sm:h-16"
          : isLogoOnly
            ? "h-8 w-auto object-contain"
            : "h-10 w-auto object-contain"
      }
      decoding="async"
    />
  );

  if (isLogoOnly) {
    return (
      <div className={className} aria-hidden="true">
        {logo}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center gap-3 ${className}`}
      aria-label="Member of the NVIDIA Inception program"
    >
      <div className={isHero ? "px-4 py-3" : "px-3 py-2"}>{logo}</div>
      <div className="text-center">
        <p
          className={
            isHero
              ? "text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary"
              : "text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600"
          }
        >
          {isHero ? "NVIDIA Inception Member - 2025" : "Member of NVIDIA Inception"}
        </p>
      </div>
    </div>
  );
}
