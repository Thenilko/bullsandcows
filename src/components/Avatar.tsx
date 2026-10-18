interface Props {
  url: string | null | undefined;
  name: string;
  size?: number;
}

/** Снимка от профила или инициал на цветен кръг. */
export function Avatar({ url, name, size = 36 }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (url) return <img src={url} alt="" style={style} className="av" referrerPolicy="no-referrer" />;
  return (
    <span className="av" style={style} aria-hidden="true">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}
