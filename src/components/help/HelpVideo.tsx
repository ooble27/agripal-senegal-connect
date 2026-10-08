import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useLang, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { guideKey, guideMedia, type GuideDef } from "@/lib/guides";

/**
 * Vidéo d'un guide dans le centre d'aide : image d'aperçu et bouton de
 * lecture ; la vidéo (avec le son et les commandes) ne se charge qu'au clic.
 */
const HelpVideo = ({ guide, className }: { guide: GuideDef; className?: string }) => {
  const t = useT();
  const [lang] = useLang();
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const media = guideMedia(guide, lang);

  useEffect(() => setPlaying(false), [guide.slug, lang]);
  useEffect(() => { if (playing) ref.current?.play().catch(() => {}); }, [playing]);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-[#f4f4f2] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]", className)}>
      {playing ? (
        <video ref={ref} key={`${guide.slug}-${lang}`} className="block aspect-video w-full" controls playsInline poster={media.poster}>
          <source src={media.video} type="video/mp4" />
          {t("guide.noVideo")}
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group relative block aspect-video w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          aria-label={`${t("faqp.watch")} : ${t(guideKey(guide, "title"))}`}
        >
          <img src={media.poster} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]" />
          <span className="absolute bottom-4 left-4 flex items-center gap-3 rounded-md bg-[#0b0b0c] py-2.5 pl-3 pr-4 text-[14px] font-medium text-white transition-transform duration-300 group-hover:-translate-y-0.5 sm:bottom-5 sm:left-5">
            <Play className="h-4 w-4 fill-current" />
            {t("faqp.watch")}
            <span className="text-white/55">{guide.duration[lang]} s</span>
          </span>
        </button>
      )}
    </div>
  );
};

export default HelpVideo;
