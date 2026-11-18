import React from "react";
import { Link } from "react-router-dom";
import "./Logo.css";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  showText?: boolean;
  subtitle?: string;
  className?: string;
  to?: string;
  ariaLabel?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  subtitle,
  className = "",
  to,
  ariaLabel = "Our House, página de inicio",
}) => {
  const pixelSize =
    typeof size === "number"
      ? size
      : size === "sm"
      ? 34
      : size === "md"
      ? 42
      : size === "lg"
      ? 56
      : 76;

  const content = (
    <span className={`our-house-logo-wrapper our-house-logo--${typeof size === "string" ? size : "custom"} ${className}`}>
      <span
        className="our-house-logo-icon-box"
        style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
      >
        <img
          src="/logo-tight.png"
          alt=""
          aria-hidden="true"
          className="our-house-logo-img"
          width={pixelSize}
          height={pixelSize}
          loading="eager"
        />
      </span>
      {showText && (
        <span className="our-house-logo-text-group">
          <span className="our-house-logo-brandname">our house</span>
          {subtitle && <span className="our-house-logo-subtitle">{subtitle}</span>}
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="our-house-logo-link" aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
