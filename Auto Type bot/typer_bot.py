import pyautogui
import pytesseract
from PIL import ImageGrab
import keyboard
import time
import sys

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

TYPING_SPEED = 0.05 

def get_coordinates(prompt):
    print(f"\n[ACTION REQUIRED] {prompt}")
    print("Move your mouse to the spot, then press 'ENTER'.")
    keyboard.wait('enter')
    pos = pyautogui.position()
    print(f"-> Coordinates recorded: {pos}")
    time.sleep(0.5) 
    return pos

def main():
    print("=== CONSTANT SPEED TYPING BOT ===")
    print("First, let's map out your screen.\n")

    top_left = get_coordinates("Move mouse to the TOP-LEFT corner of the text you want to read.")
    bottom_right = get_coordinates("Move mouse to the BOTTOM-RIGHT corner of the text you want to read.")
    
    input_area = get_coordinates("Move mouse to the INPUT BOX where you want the bot to type.")

    print("\n=== SETUP COMPLETE ===")
    print("-> Press 'F8' to read the screen and start typing.")
    print("-> Press 'ESC' to quit the program.")
    print("-> FAILSAFE: Slam your mouse into any of the 4 corners of your screen to emergency-stop the bot.\n")

    while True:
        if keyboard.is_pressed('f8'):
            print("\nReading screen...")
            bbox = (top_left.x, top_left.y, bottom_right.x, bottom_right.y)

            img = ImageGrab.grab(bbox)

            text = pytesseract.image_to_string(img).strip()

            if text:
                print(f"Text found:\n{'-'*20}\n{text}\n{'-'*20}")
                print("Clicking input area and typing in 2 seconds...")
                time.sleep(2)

                pyautogui.click(input_area.x, input_area.y)

                pyautogui.write(text, interval=TYPING_SPEED)
                
                print("Typing complete! Press F8 to do it again, or ESC to exit.")
            else:
                print("No text detected in that area. Try mapping the coordinates again.")
            
            time.sleep(1) 

        elif keyboard.is_pressed('esc'):
            print("\nExiting bot. Goodbye!")
            sys.exit()

if __name__ == "__main__":
    main()