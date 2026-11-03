"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function LandingMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const intro = gsap.timeline({ defaults: { ease: "power2.out" } });
      intro
        .from('header [data-gsap="brand"]', { opacity: 0, x: -10, duration: 0.45 })
        .from('[data-gsap="nav-link"]', { opacity: 0, y: -8, duration: 0.35, stagger: 0.07 }, "-=0.2")
        .from('[data-gsap="nav-action"]', { opacity: 0, y: -8, duration: 0.4, stagger: 0.08 }, "-=0.2")
        .from('[data-gsap="hero-eyebrow"]', { opacity: 0, y: 12, duration: 0.55 }, "-=0.05")
        .from('[data-gsap="hero-title"]', { opacity: 0, y: 30, duration: 0.9, ease: "power3.out" }, "-=0.12")
        .from('[data-gsap="hero-body"]', { opacity: 0, y: 12, duration: 0.55, stagger: 0.1 }, "-=0.34")
        .from('[data-gsap="phone"]', { opacity: 0, y: 28, rotation: 1, duration: 1.05, ease: "power2.out" }, "-=0.35");

      gsap.utils.toArray<HTMLElement>('[data-gsap="reveal"]').forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 22,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        });
      });

      gsap.from('[data-gsap="benefit"]', {
        opacity: 0,
        y: 22,
        scale: 0.985,
        duration: 0.65,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: '[data-gsap="benefit"]', start: "top 82%", once: true },
      });

      gsap.from('[data-gsap="scope-point"]', {
        opacity: 0,
        x: 18,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: '[data-gsap="scope-point"]', start: "top 84%", once: true },
      });

      gsap.from('[data-gsap="workflow-step"]', {
        opacity: 0,
        x: -16,
        duration: 0.55,
        stagger: 0.14,
        ease: "power2.out",
        scrollTrigger: { trigger: '[data-gsap="workflow-step"]', start: "top 84%", once: true },
      });
    });

    return () => media.revert();
  }, []);

  return null;
}
