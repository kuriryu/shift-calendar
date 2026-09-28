"use client";

import { useLayoutEffect } from "react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
  type Placement,
  type ReferenceType,
} from "@floating-ui/react";

/** 固定フッターに隠れないよう、下側は少し広めに空ける */
const PADDING = { top: 8, right: 8, bottom: 80, left: 8 };

/**
 * クリックした要素を基準に、ビューポート内へポップアップを置く。
 * 下に出すと画面外へ出るときは、上へ開く。
 */
export function useViewportPopover(
  anchor: ReferenceType | null,
  placement: Placement = "bottom-start",
) {
  const floating = useFloating({
    placement,
    strategy: "fixed",
    middleware: [
      offset(8),
      flip({ padding: PADDING }),
      shift({ padding: PADDING }),
      size({
        padding: PADDING,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(availableHeight, 0)}px`,
            overflowY: "auto",
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    floating.refs.setReference(anchor);
  }, [anchor, floating.refs]);

  return floating;
}
