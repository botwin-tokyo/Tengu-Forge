#!/usr/bin/env python3
import argparse
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", default="world", help="Name to greet")
    args = parser.parse_args()

    print(f"Hello, {args.name}! This is Tengu Forge.")
    print(f"Timestamp: {int(time.time())}")


if __name__ == "__main__":
    main()
