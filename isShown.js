// isShown atom, extracted from webdriver with google closure dependencies removed
// see: https://w3c.github.io/webdriver/#element-displayedness
// see: https://github.com/SeleniumHQ/selenium/blob/e09e28f016c9f53196cf68d6f71991c5af4a35d4/javascript/atoms/dom.js#L437

const isShown => (elem) {
        getDocumentScroll = function (doc) {
            let el = doc.scrollingElement;
            return {"x": window.pageXOffset || el.scrollLeft, "y": window.pageYOffset || el.scrollTop};
        };

        getEffectiveStyle = (elem, prop) => {
            if (!isElement(elem)) return '';
            return window.getComputedStyle(elem)[prop];
        };

        getOverflowState = (elem, style) => {
            if (!isElement(elem)) return false;
            let region = elem.getBoundingClientRect();
            let ownerDoc = elem.ownerDocument;
            let htmlElem = ownerDoc.documentElement;
            let bodyElem = ownerDoc.body;
            let htmlOverflowStyle = getEffectiveStyle(elem, 'overflow');
            let treatAsFixedPosition;

            // Return the closest ancestor that the given element may overflow.
            function getOverflowParent(e) {
                let position = getEffectiveStyle(e, 'position');
                if (position === 'fixed') {
                    treatAsFixedPosition = true;
                    // Fixed-position element may only overflow the viewport.
                    return e == htmlElem ? null : htmlElem;
                } else {
                    let parent = e.parentNode;
                    while (parent && !canBeOverflowed(parent)) {
                        parent = parent.parentNode;
                    }
                    return parent;
                }

                function canBeOverflowed(container) {
                    // The HTML element can always be overflowed.
                    if (container == htmlElem) {
                        return true;
                    }
                    // An element cannot overflow an element with an inline display style.
                    let containerDisplay = (
                        getEffectiveStyle(container, 'display'));
                    if (containerDisplay.startsWith('inline')) {
                        return false;
                    }
                    // An absolute-positioned element cannot overflow a static-positioned one.
                    return !(position === 'absolute' &&
                        getEffectiveStyle(container, 'position') === 'static');
                }
            }

            // Return the x and y overflow styles for the given element.
            function getOverflowStyles(e) {
                // When the <html> element has an overflow style of 'visible', it assumes
                // the overflow style of the body, and the body is really overflow:visible.
                let overflowElem = e;
                if (htmlOverflowStyle === 'visible') {
                    // Note: bodyElem will be null/undefined in SVG documents.
                    if (e == htmlElem && bodyElem) {
                        overflowElem = bodyElem;
                    } else if (e == bodyElem) {
                        return {x: 'visible', y: 'visible'};
                    }
                }
                let overflow = {
                    x: getEffectiveStyle(overflowElem, 'overflow-x'),
                    y: getEffectiveStyle(overflowElem, 'overflow-y')
                };
                // The <html> element cannot have a genuine 'visible' overflow style,
                // because the viewport can't expand; 'visible' is really 'auto'.
                if (e == htmlElem) {
                    overflow.x = overflow.x === 'visible' ? 'auto' : overflow.x;
                    overflow.y = overflow.y === 'visible' ? 'auto' : overflow.y;
                }
                return overflow;
            }

            // Returns the scroll offset of the given element.
            function getScroll(e) {
                if (e == htmlElem) {
                    return getDocumentScroll(ownerDoc);
                } else {
                    return {"x": e.scrollLeft, "y": e.scrollTop};
                }
            }

            // Check if the element overflows any ancestor element.
            for (let container = getOverflowParent(elem);
                 !!container;
                 container = getOverflowParent(container)) {
                if (!isElement(container)) continue;
                let containerOverflow = getOverflowStyles(container);

                // If the container has overflow:visible, the element cannot overflow it.
                if (containerOverflow.x === 'visible' && containerOverflow.y === 'visible') {
                    continue;
                }

                let containerRect = container.getBoundingClientRect();

                // Zero-sized containers without overflow:visible hide all descendants.
                if (containerRect.width === 0 || containerRect.height === 0) {
                    return 'hidden';
                }

                // Check "underflow": if an element is to the left or above the container
                let underflowsX = region.right < containerRect.left;
                let underflowsY = region.bottom < containerRect.top;
                if ((underflowsX && containerOverflow.x === 'hidden') ||
                    (underflowsY && containerOverflow.y === 'hidden')) {
                    return 'hidden';
                } else if ((underflowsX && containerOverflow.x !== 'visible') ||
                    (underflowsY && containerOverflow.y !== 'visible')) {
                    // When the element is positioned to the left or above a container, we
                    // have to distinguish between the element being completely outside the
                    // container and merely scrolled out of view within the container.
                    let containerScroll = getScroll(container);
                    let unscrollableX = region.right < containerRect.left - containerScroll.x;
                    let unscrollableY = region.bottom < containerRect.top - containerScroll.y;
                    if ((unscrollableX && containerOverflow.x !== 'visible') ||
                        (unscrollableY && containerOverflow.x !== 'visible')) {
                        return 'hidden';
                    }
                    let containerState = getOverflowState(container);
                    return containerState === 'hidden' ?
                        'hidden' : 'scroll';
                }

                // Check "overflow": if an element is to the right or below a container
                let overflowsX = region.left >= containerRect.left + containerRect.width;
                let overflowsY = region.top >= containerRect.top + containerRect.height;
                if ((overflowsX && containerOverflow.x === 'hidden') ||
                    (overflowsY && containerOverflow.y === 'hidden')) {
                    return 'hidden';
                } else if ((overflowsX && containerOverflow.x !== 'visible') ||
                    (overflowsY && containerOverflow.y !== 'visible')) {
                    // If the element has fixed position and falls outside the scrollable area
                    // of the document, then it is hidden.
                    if (treatAsFixedPosition) {
                        let docScroll = getScroll(container);
                        if ((region.left >= htmlElem.scrollWidth - docScroll.x) ||
                            (region.right >= htmlElem.scrollHeight - docScroll.y)) {
                            return 'hidden';
                        }
                    }
                    // If the element can be scrolled into view of the parent, it has a scroll
                    // state; unless the parent itself is entirely hidden by overflow, in
                    // which it is also hidden by overflow.
                    let containerState = getOverflowState(container);
                    return containerState === 'hidden' ?
                        'hidden' : 'scroll';
                }
            }

            // Does not overflow any ancestor.
            return 'none';
        };

        isElement = (elem) => {
            return (elem instanceof Element);
        };

        ascendToElement = (elem, parentTagName) => {
            if (!isElement(elem)) return false;
            if (elem.parentNode.tagName === parentTagName) {
                return elem.parentNode;
            }
            return ascendToElement(elem.parentNode, parentTagName);
        };

        positiveSize = (elem) => {
            let rect = elem.getBoundingClientRect();
            if (!isElement(elem)) return false;
            if (rect.height > 0 || rect.width > 0) return true;

            // A vertical or horizontal SVG Path element will report zero width or
            // height but is "shown" if it has a positive stroke-width.
            if (elem.tagName === 'PATH' && (rect.height > 0 || rect.width > 0)) {
                let strokeWidth = style.strokeWidth;
                return !!strokeWidth && (parseInt(strokeWidth, 10) > 0);
            }
            // Zero-sized elements should still be considered to have positive size
            // if they have a child element or text node with positive size, unless
            // the element has an 'overflow' style of 'hidden'.
            return getEffectiveStyle(elem, 'overflow') !== 'hidden' &&
                Array.prototype.slice.call(elem.childNodes).some((item) => {
                    return item.nodeType === 'TEXT' ||
                        (isElement(item) && positiveSize(item))
                });
        };

        hiddenByOverflow = (elem, style) => {
            return getOverflowState(elem) === 'hidden' &&
                Array.prototype.slice.call(elem.childNodes).every((item) => {
                    return !isElement(item) ||
                        hiddenByOverflow(item) ||
                        !positiveSize(item);
                });
        };

        checkVisibilityByPoints = (elem) => {
            let rect = elem.getBoundingClientRect();
            let left = rect.left;
            let top = rect.top;
            let width = elem.offsetWidth;
            let height = elem.offsetHeight;
            const points = [
                {x: left + width / 2, y: top + height / 2},
                {x: left + width / 4, y: top + height / 4},
                {x: left + 3 * width / 4, y: top + height / 4},
                {x: left + width / 4, y: top + 3 * height / 4},
                {x: left + 3 * width / 4, y: top + 3 * height / 2},
                {x: left + width / 4, y: top + height / 2},
                {x: left + 3 * width / 4, y: top + height / 2},
                {x: left + width / 2, y: top + height / 4},
                {x: left + width / 2, y: top + 3 * height / 4},
            ];
            let elemCenter = points[0];
            if (elemCenter.x < 0) return false;
            if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
            if (elemCenter.y < 0) return false;
            if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
            let nodeState = true;
            let checkPointVisibility = (point) => {
                if (nodeState === true) return;
                let pointContainer = document.elementFromPoint(point.x, point.y);
                do {
                    if (pointContainer === elem) {
                        nodeState = true;
                        return;
                    }
                } while (pointContainer && (pointContainer = pointContainer.parentNode));
            };
            points.forEach((item) => {
                checkPointVisibility(item)
            });
            return nodeState;
        };

        isElementVisible = (elem, considerOpacity = true, checkPointsVisibility = false) => {
            if (!isElement(elem)) throw Error('DomUtil: elem is not an element.');
            // By convention, BODY element is always shown: BODY represents the document
            // and even if there's nothing rendered in there, user can always see there's
            // the document.
            if (elem.tagName === 'BODY') return true;

            // Option or optgroup is shown if enclosing select is shown (ignoring the
            // select's opacity).
            if (elem.tagName === 'OPTION' || elem.tagName === 'OPTGROUP') {
                let select = ascendToElement(elem, 'SELECT');
                if (select === false) {
                    return false;
                }
                return isElementVisible(select, false);
            }

            // Image map elements are shown if image that uses it is shown, and
            // the area of the element is positive.
            if (elem.tagName === 'MAP') {
                let mapname = elem.name;
                return isElementVisible(document.querySelector(`[usemap='#${mapname}']`))
            }

            // Any hidden input is not shown.
            if (elem.tagName === 'INPUT' && elem.type.toLowerCase() === 'hidden') {
                return false;
            }

            // Any NOSCRIPT element is not shown.
            if (elem.tagName === 'NOSCRIPT') {
                return false;
            }

            // Any element with hidden/collapsed visibility is not shown.
            let visibility = getEffectiveStyle(elem, 'visibility');
            if (visibility === 'collapse' || visibility === 'hidden') return false;

            const style = getComputedStyle(elem);
            if (style.display === 'none') return false;
            // Any transparent element is not shown.
            if (considerOpacity && style.opacity < 0.1) return false;
            // Any element without positive size dimensions is not shown.
            if (!positiveSize(elem)) return false;

            // Elements that are hidden by overflow are not shown.
            if (hiddenByOverflow(elem, style)) {
                return false;
            }

            if (checkPointsVisibility) {
                return checkVisibilityByPoints(elem);
            }
            return true;
        };
        return isElementVisible(elem);
    }

// Example:

isShown($('body'));
