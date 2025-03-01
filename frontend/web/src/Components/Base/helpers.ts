import { MouseEvent } from "react"
import { ColorStatic } from "../../Lib/Colors/ColorStatic"

export function ripple(event: MouseEvent<HTMLElement>, rippleColor = 'rgba(255, 255, 255, 0.7)', fromCenter = false) {
    const btn = event.currentTarget
    const btnRect = btn.getBoundingClientRect()

    const circle = document.createElement("span")
    const diameter = Math.max(btnRect.width, btnRect.height)
    const radius = diameter / 2

    let rgb = ColorStatic.parse(rippleColor).toRgb();
    rgb.setAlpha(0.7)

    circle.style.width = circle.style.height = `${diameter}px`
    if (!fromCenter) {
        circle.style.top = `${event.clientY - (btnRect.top + radius)}px`
        circle.style.left = `${event.clientX - (btnRect.left + radius)}px`
    } else {
        circle.style.top = `${(btnRect.width / 2) - radius}px`
        circle.style.left = `${(btnRect.height / 2) - radius}px`
    }
    circle.style.backgroundColor = rgb.toHex()
    circle.classList.add("ripple")

    const ripple = btn.getElementsByClassName("ripple")[0]

    if (ripple)
        ripple.remove()

    btn.appendChild(circle)
}
