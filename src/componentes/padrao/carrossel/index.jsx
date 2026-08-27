import { useRef, useEffect, useState, useCallback } from "react";

const ITEM_HEIGHT = 150;
// Gap layout maior para o espaço visual entre o selecionado (scale 1.1) e o vizinho
// ficar próximo do que se vê hoje entre os cards 9 e 10 com o card 0 selecionado.
const ITEM_GAP = 45;
const FULL_ITEM_HEIGHT = ITEM_HEIGHT + ITEM_GAP;

const DRAG_CLICK_THRESHOLD = 5;

const getScale = (index, selectedIndex, totalItems) => {
  const rawDiff = Math.abs(index - selectedIndex);
  const distance = Math.min(rawDiff, totalItems - rawDiff);

  if (distance === 0) return 1.1;
  if (distance === 1) return 1;
  if (distance === 2) return 0.9;
  return 0.8;
};

const CardCarrossel = ({
  cor,
  index,
  isSelected,
  selectedIndex,
  totalItems,
  objeto,
  onSelect,
}) => {
  const distance = Math.min(
    Math.abs(index - selectedIndex),
    totalItems - Math.abs(index - selectedIndex),
  );
  const scale = getScale(index, selectedIndex, totalItems);

  return (
    <div
      style={{
        height: `${FULL_ITEM_HEIGHT}px`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onSelect}
        style={{
          backgroundColor: isSelected ? "cyan" : cor,
          width: "225px",
          height: `${ITEM_HEIGHT}px`,
          flexShrink: 0,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "1.2rem",
          cursor: "pointer",
          transition:
            "background-color 0.4s ease, transform 0.3s ease, opacity 0.3s ease",
          transform: `scale(${scale})`,
          opacity: distance > 1 ? 0.5 : 1,
        }}
      >
        {objeto?.nme_card}
      </div>
    </div>
  );
};

const ComponenteCarrossel = ({ baseItems }) => {
  const carouselRef = useRef(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const targetScrollTop = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const animFrameId = useRef(null);
  const autoPlayTimer = useRef(null);
  const isUserInteracting = useRef(false);

  const globalItemIndex = useRef(0);

  const [cardSelecionado, setCardSelecionado] = useState(baseItems[0] || {});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const TOTAL_ITEMS = baseItems?.length || 0;

  const scrollToGlobalIndex = useCallback((gIndex) => {
    if (!carouselRef.current) return;
    const containerHeight = carouselRef.current.clientHeight;

    // Centro do slot (card centrado em FULL_ITEM_HEIGHT) alinhado ao centro da div pai
    const itemCenter = gIndex * FULL_ITEM_HEIGHT + FULL_ITEM_HEIGHT / 2;
    targetScrollTop.current = itemCenter - containerHeight / 2;
  }, []);

  const updateNearestSelected = useCallback(() => {
    if (!carouselRef.current || !TOTAL_ITEMS) return;
    const el = carouselRef.current;
    const viewportCenter = el.scrollTop + el.clientHeight / 2;

    // Índice cujo centro de slot está mais perto do centro da viewport
    const rawIndex = Math.round(
      (viewportCenter - FULL_ITEM_HEIGHT / 2) / FULL_ITEM_HEIGHT,
    );

    globalItemIndex.current = rawIndex;

    const nearestIndex = ((rawIndex % TOTAL_ITEMS) + TOTAL_ITEMS) % TOTAL_ITEMS;
    setSelectedIndex(nearestIndex);
    setCardSelecionado(baseItems[nearestIndex] || {});
  }, [TOTAL_ITEMS, baseItems]);

  const snapToNearest = useCallback(() => {
    updateNearestSelected();
    scrollToGlobalIndex(globalItemIndex.current);
  }, [updateNearestSelected, scrollToGlobalIndex]);

  const resetAutoPlayTimer = useCallback(() => {
    if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);

    autoPlayTimer.current = setInterval(() => {
      globalItemIndex.current += 1;

      scrollToGlobalIndex(globalItemIndex.current);

      const nextItemIndex =
        ((globalItemIndex.current % TOTAL_ITEMS) + TOTAL_ITEMS) % TOTAL_ITEMS;
      setSelectedIndex(nextItemIndex);
      setCardSelecionado(baseItems[nextItemIndex] || {});
    }, 10000);
  }, [TOTAL_ITEMS, scrollToGlobalIndex, baseItems]);

  const handleCardSelect = useCallback(
    (globalIndex, item) => {
      if (hasDragged.current) return;

      isUserInteracting.current = true;
      velocity.current = 0;
      globalItemIndex.current = globalIndex;
      scrollToGlobalIndex(globalIndex);

      const itemIndex =
        ((globalIndex % TOTAL_ITEMS) + TOTAL_ITEMS) % TOTAL_ITEMS;
      setSelectedIndex(itemIndex);
      setCardSelecionado(item);
      resetAutoPlayTimer();
    },
    [TOTAL_ITEMS, scrollToGlobalIndex, resetAutoPlayTimer],
  );

  const updateScroll = useCallback(() => {
    if (!carouselRef.current) return;

    const el = carouselRef.current;
    const contentHeight = TOTAL_ITEMS * FULL_ITEM_HEIGHT;

    if (isDragging.current) {
      el.scrollTop += (targetScrollTop.current - el.scrollTop) * 0.15;
      updateNearestSelected();
    } else if (Math.abs(velocity.current) > 0.1) {
      // Momentum do wheel: move livre e mantém o target alinhado para não voltar ao item antigo
      el.scrollTop -= velocity.current;
      velocity.current *= 0.92;
      targetScrollTop.current = el.scrollTop;
      updateNearestSelected();
    } else {
      if (isUserInteracting.current && velocity.current !== 0) {
        velocity.current = 0;
        snapToNearest();
      }
      el.scrollTop += (targetScrollTop.current - el.scrollTop) * 0.1;
    }

    if (el.scrollTop <= 0) {
      el.scrollTop += contentHeight;
      targetScrollTop.current += contentHeight;
      globalItemIndex.current += TOTAL_ITEMS;
    } else if (el.scrollTop >= contentHeight * 2) {
      el.scrollTop -= contentHeight;
      targetScrollTop.current -= contentHeight;
      globalItemIndex.current -= TOTAL_ITEMS;
    }

    animFrameId.current = requestAnimationFrame(updateScroll);
  }, [TOTAL_ITEMS, updateNearestSelected, snapToNearest]);

  const handleWheel = (e) => {
    e.preventDefault();
    isUserInteracting.current = true;
    velocity.current -= e.deltaY * 0.15;
    resetAutoPlayTimer();
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    hasDragged.current = false;
    isUserInteracting.current = true;
    carouselRef.current.style.cursor = "grabbing";
    startY.current = e.pageY;
    lastY.current = e.pageY;
    scrollTop.current = carouselRef.current.scrollTop;
    targetScrollTop.current = carouselRef.current.scrollTop;
    velocity.current = 0;

    resetAutoPlayTimer();
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
      if (carouselRef.current) carouselRef.current.style.cursor = "grab";
      velocity.current = 0;
      snapToNearest();
      resetAutoPlayTimer();
    }
  };

  const handleMouseLeave = () => {
    handleMouseUp();
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();

    const deltaY = e.pageY - lastY.current;
    velocity.current = deltaY * 1.2;
    lastY.current = e.pageY;

    const walk = (e.pageY - startY.current) * 1.5;
    if (Math.abs(e.pageY - startY.current) > DRAG_CLICK_THRESHOLD) {
      hasDragged.current = true;
    }
    targetScrollTop.current = scrollTop.current - walk;
  };

  useEffect(() => {
    globalItemIndex.current = TOTAL_ITEMS;
    scrollToGlobalIndex(globalItemIndex.current);
    resetAutoPlayTimer();

    animFrameId.current = requestAnimationFrame(updateScroll);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [TOTAL_ITEMS, scrollToGlobalIndex, resetAutoPlayTimer, updateScroll]);

  return (
    <div
      style={{
        background: "red",
        height: "80vh",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          position: "absolute",
          backgroundColor: "gray",
          inset: "25px 50px",
          color: "red",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "5rem",
        }}
      >
        Teste {cardSelecionado?.nme_card}
      </div>

      <div
        ref={carouselRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          height: "100%",
          cursor: "grab",
          userSelect: "none",
          paddingLeft: 50,
          paddingRight: 50,
          paddingTop: 0,
          paddingBottom: 0,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          willChange: "scroll-position",
        }}
      >
        {[...baseItems, ...baseItems, ...baseItems].map((item, i) => {
          const itemIndex = i % TOTAL_ITEMS;
          return (
            <CardCarrossel
              key={i}
              objeto={item}
              index={itemIndex}
              totalItems={TOTAL_ITEMS}
              cor="yellowgreen"
              selectedIndex={selectedIndex}
              isSelected={itemIndex === selectedIndex}
              onSelect={() => handleCardSelect(i, item)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ComponenteCarrossel;
