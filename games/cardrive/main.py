'''
from game import Game

if __name__ == "__main__":
    Game().run()
'''

# main.py becomes:
import asyncio
import pygame
from game import Game

async def main():
    game = Game()
    while True:
        game.tick()          # one frame, no blocking
        await asyncio.sleep(0)   # yield to browser event loop

asyncio.run(main())