const forbidden = new Set([
  "http",
  "https",
  "javascript",
  "data",
  "file",
  "about",
  "intent",
]);
export function externalAppUrl(value: string): string {
  let result = value;
  if (value.startsWith("intent://")) {
    const match = /^intent:\/\/(.*?)#Intent;(.*);end$/.exec(value);
    const scheme = match?.[2]
      .split(";")
      .find((part) => part.startsWith("scheme="))
      ?.slice(7);
    if (
      !match ||
      !scheme ||
      !/^[a-z][a-z0-9+.-]*$/i.test(scheme) ||
      forbidden.has(scheme.toLowerCase())
    )
      throw new Error("지원하지 않는 앱 연결 주소입니다.");
    result = `${scheme}://${match[1]}`;
  }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(result)?.[1].toLowerCase();
  if (!scheme || forbidden.has(scheme))
    throw new Error("지원하지 않는 앱 연결 주소입니다.");
  return result;
}
