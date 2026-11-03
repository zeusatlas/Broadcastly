"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function PhoneNumberInput() {
  const [phone, setPhone] = useState("");

  return (
    <Input
      name="phone"
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      pattern="[0-9]*"
      value={phone}
      onChange={(event) => setPhone(event.currentTarget.value.replace(/\D/g, ""))}
      placeholder="Enter your phone number"
      required
    />
  );
}
