type IconProps = { className?: string };

function base(path: string, { className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return base(
    'M7 3.5h3.2l1.2 3.2-2 1.2a12 12 0 0 0 5.7 5.7l1.2-2 3.2 1.2V16a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 6.7 2 2 0 0 1 7 3.5z',
    props,
  );
}

export function MessageIcon(props: IconProps) {
  return base('M5 6.5h14v9H8l-3 2.5v-11.5z', props);
}

export function SearchIcon(props: IconProps) {
  return base('M11 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10z M15.5 15.5 19 19', props);
}

export function CheckIcon(props: IconProps) {
  return base('M5 12.5 9.2 17 19 7', props);
}

export function UserIcon(props: IconProps) {
  return base('M12 12a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 12z M5.5 19.2a6.5 6.5 0 0 1 13 0', props);
}

export function HomeIcon(props: IconProps) {
  return base('M4 11.5 12 4l8 7.5V20H4z M10 20v-6h4v6', props);
}

export function ShieldIcon(props: IconProps) {
  return base('M12 3.5 19 6.2V12c0 4.2-2.8 6.8-7 8.3C7.8 18.8 5 16.2 5 12V6.2z', props);
}
