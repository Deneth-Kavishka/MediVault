import Landing3DAnimation from "@/components/landing-3d-animation";

type Props = {
  className?: string;
};

// Backwards-compat wrapper: the app moved from D3 (data-viz) to a true 3D animation.
export default function LandingD3Animation({ className }: Props) {
  return <Landing3DAnimation className={className} />;
}
