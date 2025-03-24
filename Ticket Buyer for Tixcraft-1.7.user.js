// ==UserScript==
// @name         Ticket Buyer for Tixcraft
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Automate ticket buying on tixcraft.com
// @author       You
// @match        https://tixcraft.com/activity/detail/*
// @match        https://tixcraft.com/activity/game/*
// @match        https://tixcraft.com/ticket/area/*
// @match        https://tixcraft.com/ticket/ticket/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://unpkg.com/tesseract.js@4.0.0/dist/tesseract.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Configuration: Choose the event date, seat, and ticket quantity
    const PREFERRED_DATE_KEY = '19066'; // '19066' for 14:00, '19067' for 19:30
    const PREFERRED_SEAT = '3樓D區1800'; // Specify your preferred seat
    const TICKET_QUANTITY = '2'; // Specify the number of tickets (e.g., '1' or '2')

    // Wait for jQuery to load
    function waitForJQuery(callback) {
        if (typeof jQuery === 'undefined') {
            console.log("jQuery not loaded yet, waiting...");
            setTimeout(() => waitForJQuery(callback), 500);
        } else {
            console.log("jQuery loaded, starting script...");
            callback();
        }
    }

    // Utility function to wait for a visible element to appear
    function waitForVisibleElement(selector, callback, maxAttempts = 30, interval = 1000) {
        let attempts = 0;
        const checkElement = setInterval(() => {
            attempts++;
            const element = $(selector).filter(':visible');
            if (element.length) {
                console.log(`Visible element found: ${selector}`);
                clearInterval(checkElement);
                callback(element);
            } else if (attempts >= maxAttempts) {
                console.log(`Error: Visible element not found after ${maxAttempts} attempts: ${selector}`);
                if (selector.includes('.btn-area')) {
                    const buttonArea = $('.btn-area').first();
                    if (buttonArea.length) {
                        console.log("Button area HTML: ", buttonArea.html());
                    }
                }
                clearInterval(checkElement);
            } else {
                console.log(`Waiting for visible element: ${selector} (Attempt ${attempts}/${maxAttempts})`);
            }
        }, interval);
    }

    // Utility function to simulate a realistic click
    function simulateClick(element) {
        const mouseEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(mouseEvent);
        console.log("Simulated click on element");
    }

    // Step 1: On the detail page, click "立即購票"
    function handleDetailPage() {
        console.log("On detail page, looking for Buy Now button...");
        waitForVisibleElement(".buy a", (buyNowButton) => {
            const href = buyNowButton.attr('href');
            console.log(`Found '立即購票' button with href: ${href}`);
            window.location.href = href;
            console.log("Navigating to game page in the same tab...");
        });
    }

    // Step 2: On the game page, select the date and click "Find tickets"
    function handleGamePage() {
        console.log("On game page, starting date selection process...");
        waitForVisibleElement("#dateSearchGameList", (dateSelect) => {
            const targetDate = "2025/05/10 (Sat.)";
            dateSelect.val(targetDate);
            dateSelect.trigger("change");
            console.log(`Set date filter to '${targetDate}' and triggered searchEvent`);

            waitForVisibleElement("#gameList", () => {
                console.log("Game list table loaded, looking for date row...");
                const dateRowSelector = `tr[data-key='${PREFERRED_DATE_KEY}']`;
                waitForVisibleElement(dateRowSelector, () => {
                    console.log(`Date row found: ${dateRowSelector}`);
                    const dateButtonSelector = `${dateRowSelector} .btn-primary`;
                    waitForVisibleElement(dateButtonSelector, (dateButton) => {
                        const href = dateButton.attr('data-href');
                        console.log(`Found 'Find tickets' button with data-href: ${href}`);
                        window.location.href = href;
                        console.log(`Navigating to ticket area page for date with data-key=${PREFERRED_DATE_KEY}`);
                    });
                });
            });
        });
    }

    // Step 3: On the ticket area page, select a seat and proceed
    function handleTicketAreaPage() {
        console.log("On ticket area page, starting seat selection process...");
        const seatSelector = `.select_form_b a:contains('${PREFERRED_SEAT}'), .select_form_a a:contains('${PREFERRED_SEAT}')`;
        waitForVisibleElement(seatSelector, (ticketLink) => {
            console.log(`Ticket selected: ${ticketLink.text()}`);
            const href = ticketLink.attr('href');
            if (href && href !== '#' && href !== 'javascript:void(0)') {
                console.log(`Seat link has href: ${href}, navigating directly...`);
                window.location.href = href;
            } else {
                console.log("Seat link has no href or uses JavaScript, simulating click...");
                setTimeout(() => {
                    simulateClick(ticketLink[0]);
                }, 500);
            }
        });
    }

    // Step 4: On the ticket quantity page, select quantity, check terms, and submit
    function handleTicketQuantityPage() {
        console.log("On ticket quantity page, selecting quantity and submitting...");

        // Step 4.1: Select the ticket quantity
        waitForVisibleElement("#TicketForm_ticketPrice_06", (quantitySelect) => {
            quantitySelect.val(TICKET_QUANTITY);
            quantitySelect.trigger("change");
            console.log(`Selected ticket quantity: ${TICKET_QUANTITY}`);

            // Step 4.2: Check the Terms of Use checkbox
            waitForVisibleElement("input[type='checkbox']", (checkbox) => {
                checkbox.prop('checked', true);
                console.log("Checked Terms of Use checkbox");

                // Step 4.3: Click the Submit button
                waitForVisibleElement(
                    ".btn-success, [type='submit'], .btn:contains('Submit')",
                    (submitButton) => {
                        // Step 4.4: Handle verification code
                        waitForVisibleElement(".verify-input", (verifyInput) => {
                            if (verifyInput.is(":visible")) {
                                // Find the CAPTCHA image
                                const captchaImage = verifyInput.siblings('img').first();
                                const captchaImageUrl = captchaImage.attr('src') || '';
                                console.log(`CAPTCHA image URL: ${captchaImageUrl} (open this URL in a new tab if needed)`);

                                // Manual entry (recommended)
                                let code = prompt("Enter CAPTCHA code (check the console for the CAPTCHA image URL):");
                                if (code) {
                                    verifyInput.val(code);
                                    console.log("Verification code entered: " + code);
                                    submitButton.click();
                                    console.log("Submit button clicked");

                                    // Check for CAPTCHA error and retry if needed
                                    setTimeout(() => {
                                        const errorMessage = $('.error-message:visible, .alert-danger:visible').text();
                                        if (errorMessage && errorMessage.toLowerCase().includes('captcha')) {
                                            console.log("CAPTCHA verification failed, retrying...");
                                            handleTicketQuantityPage(); // Retry the step
                                        }
                                    }, 2000);
                                }


                                // Optional: Use Tesseract.js for OCR (uncomment to enable, but use with caution)
                                Tesseract.recognize(
                                    captchaImageUrl,
                                    'eng',
                                    { logger: (m) => console.log(m) }
                                ).then(({ data: { text } }) => {
                                    const cleanedCode = text.replace(/[^a-zA-Z]/g, ''); // Only alphabetic letters
                                    console.log(`OCR extracted CAPTCHA code: ${cleanedCode}`);
                                    if (cleanedCode) {
                                        verifyInput.val(cleanedCode);
                                        console.log("Verification code entered via OCR: " + cleanedCode);
                                        submitButton.click();
                                        console.log("Submit button clicked");

                                        // Check for CAPTCHA error and retry if needed
                                        setTimeout(() => {
                                            const errorMessage = $('.error-message:visible, .alert-danger:visible').text();
                                            if (errorMessage && errorMessage.toLowerCase().includes('captcha')) {
                                                console.log("CAPTCHA verification failed, retrying...");
                                                handleTicketQuantityPage(); // Retry the step
                                            }
                                        }, 2000);
                                    } else {
                                        console.log("OCR failed to extract CAPTCHA code, falling back to manual entry...");
                                        let code = prompt("OCR failed. Enter CAPTCHA code manually:");
                                        if (code) {
                                            verifyInput.val(code);
                                            console.log("Verification code entered manually: " + code);
                                            submitButton.click();
                                            console.log("Submit button clicked");
                                        }
                                    }
                                }).catch((err) => {
                                    console.error("OCR error:", err);
                                    let code = prompt("OCR failed. Enter CAPTCHA code manually:");
                                    if (code) {
                                        verifyInput.val(code);
                                        console.log("Verification code entered manually: " + code);
                                        submitButton.click();
                                        console.log("Submit button clicked");
                                    }
                                });
                                
                            }
                        }, 10); // Shorter wait for CAPTCHA
                    },
                    60 // Timeout for Submit button
                );
            });
        });
    }

    // Main function to determine the current page and execute the appropriate step
    function startTicketPurchase() {
        let currentUrl = window.location.href;
        console.log("Script triggered for URL: " + currentUrl);

        if (currentUrl.includes('/activity/detail/')) {
            console.log("Detected detail page, running handleDetailPage...");
            handleDetailPage();
        } else if (currentUrl.includes('/activity/game/')) {
            console.log("Detected game page, running handleGamePage...");
            handleGamePage();
        } else if (currentUrl.includes('/ticket/area/')) {
            console.log("Detected ticket area page, running handleTicketAreaPage...");
            handleTicketAreaPage();
        } else if (currentUrl.includes('/ticket/ticket/')) {
            console.log("Detected ticket quantity page, running handleTicketQuantityPage...");
            handleTicketQuantityPage();
        } else {
            console.log("Script does not match any expected page: " + currentUrl);
        }
    }

    // Start the process
    console.log("Initializing script...");
    waitForJQuery(startTicketPurchase);
})();