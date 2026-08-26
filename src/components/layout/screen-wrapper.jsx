import React from "react";
import { AppLayout } from "./AppLayout";

export function ScreenWrapper({
  children,
  title,
  subtitle,
  description,
  tagText = "★ Tribo",
  headerRight,
  style,
  cardStyle,
  contentStyle,
}) {
  return (
    <AppLayout
      title={title}
      description={description || subtitle}
      tagText={tagText}
      headerRight={headerRight}
      style={style}
      cardStyle={cardStyle}
      contentStyle={contentStyle}
    >
      {children}
    </AppLayout>
  );
}

export default ScreenWrapper;
