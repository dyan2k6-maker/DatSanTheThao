import { useRef, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * useDragScroll
 * Enables horizontal mouse dragging on web for ScrollView / FlatList
 * while preserving native touch and smooth scrolling.
 */
export function useDragScroll({
  enabled = true,
  snapToInterval = 0,
  pagingEnabled = false,
  pageSize = 0,
} = {}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const getScrollNode = useCallback(() => {
    if (!scrollRef.current) return null;
    if (typeof scrollRef.current.getScrollableNode === 'function') {
      return scrollRef.current.getScrollableNode();
    }
    if (scrollRef.current instanceof HTMLElement) {
      return scrollRef.current;
    }
    if (scrollRef.current._nativeRef) {
      return scrollRef.current._nativeRef;
    }
    return null;
  }, []);

  const updateScrollState = useCallback(() => {
    if (Platform.OS !== 'web') return;
    const node = getScrollNode();
    if (!node) return;

    const { scrollLeft, scrollWidth, clientWidth } = node;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < maxScroll - 5);
  }, [getScrollNode]);

  const scrollByDelta = useCallback((delta) => {
    const node = getScrollNode();
    if (!node) return;
    if (typeof node.scrollBy === 'function') {
      node.scrollBy({ left: delta, behavior: 'smooth' });
    } else {
      node.scrollLeft += delta;
    }
  }, [getScrollNode]);

  const scrollLeftAction = useCallback((amount) => {
    const node = getScrollNode();
    if (!node) return;
    const delta = -(amount || snapToInterval || Math.max(200, node.clientWidth * 0.75));
    scrollByDelta(delta);
  }, [getScrollNode, snapToInterval, scrollByDelta]);

  const scrollRightAction = useCallback((amount) => {
    const node = getScrollNode();
    if (!node) return;
    const delta = amount || snapToInterval || Math.max(200, node.clientWidth * 0.75);
    scrollByDelta(delta);
  }, [getScrollNode, snapToInterval, scrollByDelta]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const node = getScrollNode();
    if (!node) return;

    // Apply baseline web touch action & grab cursor
    node.style.touchAction = 'pan-y';
    node.style.cursor = 'grab';

    // Prevent default browser image dragging inside container
    const handleDragStart = (e) => {
      e.preventDefault();
    };
    node.addEventListener('dragstart', handleDragStart);

    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialScrollLeft = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocityX = 0;
    let rafMomentum = null;

    const onMouseDown = (e) => {
      // Left click only
      if (e.button !== 0) return;

      if (rafMomentum) {
        cancelAnimationFrame(rafMomentum);
        rafMomentum = null;
      }

      isDown = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      initialScrollLeft = node.scrollLeft;
      lastX = e.clientX;
      lastTime = performance.now();
      velocityX = 0;
    };

    const onMouseMove = (e) => {
      if (!isDown) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (!isDragging) {
        // If moving vertically more than horizontally before drag threshold, don't hijack
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          isDown = false;
          return;
        }

        // Drag threshold ~5px
        if (Math.abs(deltaX) > 5) {
          isDragging = true;
          node.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
        }
      }

      if (isDragging) {
        node.scrollLeft = initialScrollLeft - deltaX;

        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          velocityX = (e.clientX - lastX) / dt;
        }
        lastX = e.clientX;
        lastTime = now;
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;

      node.style.cursor = 'grab';
      document.body.style.userSelect = '';

      if (isDragging) {
        // Block the immediate subsequent click event in capture phase
        const preventClickCapture = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };

        window.addEventListener('click', preventClickCapture, { capture: true, once: true });
        setTimeout(() => {
          window.removeEventListener('click', preventClickCapture, { capture: true });
        }, 120);

        // Check snapping (pagingEnabled or snapToInterval)
        const stepInterval = snapToInterval || (pagingEnabled ? (pageSize || node.clientWidth) : 0);

        if (stepInterval > 0) {
          let targetIndex = Math.round(node.scrollLeft / stepInterval);
          if (Math.abs(velocityX) > 0.25) {
            targetIndex += velocityX < 0 ? 1 : -1;
          }
          const targetLeft = Math.max(0, targetIndex * stepInterval);
          if (typeof node.scrollTo === 'function') {
            node.scrollTo({ left: targetLeft, behavior: 'smooth' });
          } else {
            node.scrollLeft = targetLeft;
          }
        } else if (Math.abs(velocityX) > 0.1) {
          // Simple momentum physics with friction decay
          let currentV = velocityX * 14;
          const friction = 0.92;

          const momentumStep = () => {
            if (Math.abs(currentV) < 0.4) {
              rafMomentum = null;
              updateScrollState();
              return;
            }
            node.scrollLeft -= currentV;
            currentV *= friction;
            rafMomentum = requestAnimationFrame(momentumStep);
          };

          rafMomentum = requestAnimationFrame(momentumStep);
        }
      }

      updateScrollState();
    };

    node.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const onScroll = () => {
      updateScrollState();
    };

    node.addEventListener('scroll', onScroll, { passive: true });

    // Initial check & resize observer
    updateScrollState();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateScrollState())
      : null;

    if (ro) ro.observe(node);

    return () => {
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      node.removeEventListener('scroll', onScroll);
      if (ro) ro.disconnect();
      if (rafMomentum) cancelAnimationFrame(rafMomentum);
      node.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [enabled, getScrollNode, updateScrollState, snapToInterval, pagingEnabled, pageSize]);

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scrollLeftAction,
    scrollRightAction,
    updateScrollState,
  };
}
