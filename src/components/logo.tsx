import { env } from "../env";

// Iran Nation logo from forum
const LOGO_URL = "https://forum.irannation.com/api/v4/image/04e00544-4bed-46fc-8db8-901814ada24a.png";

export function Logo() {
  return (
    <img
      src={LOGO_URL}
      style={{ height: 38, width: 90 }}
      className="object-contain object-left"
      alt={`${env.REACT_APP_NAME} logo`}
    />
  );
}
