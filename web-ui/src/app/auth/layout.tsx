import { AuthSessionGate } from "@/components/auth/auth-session-gate";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return <AuthSessionGate>{children}</AuthSessionGate>;
}
