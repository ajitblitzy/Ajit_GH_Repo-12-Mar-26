"""Print the Blitzy welcome text, unformatted, to standard output."""

# Transcribed from welcome_to_blitzy.png; do not reformat this text.
WELCOME_TEXT = (
    "Welcome to Blitzy\n"
    "AI-Powered Code Generation & Technical Specifications"
)


def get_welcome_text() -> str:
    """Supply the payload text; returns it exactly as transcribed."""
    return WELCOME_TEXT


def print_welcome_text(text: str) -> None:
    """Emit the given text to standard output; returns nothing."""
    print(text)


def main() -> None:
    """Compose the supply and emission flows; returns nothing."""
    print_welcome_text(get_welcome_text())


if __name__ == "__main__":
    main()
