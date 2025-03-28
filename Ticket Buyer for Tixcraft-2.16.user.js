// ==UserScript==
// @name         Ticket Buyer for Tixcraft
// @namespace    http://tampermonkey.net/
// @version      2.17
// @description  Automate ticket buying on tixcraft.com (optimized for performance)
// @author       You
// @match        https://tixcraft.com/activity/detail/*
// @match        https://tixcraft.com/activity/game/*
// @match        https://tixcraft.com/ticket/area/*
// @match        https://tixcraft.com/ticket/ticket/*
// @match        https://tixcraft.com/ticket/verify/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Use jQuery.noConflict to avoid conflicts with the website's jQuery
    const $ = jQuery.noConflict(true);

    // Flag to prevent the script from running multiple times on the same page
    let isScriptRunning = false;

    // Configuration: Choose the event date, ticket quantity, and presale code
    const PREFERRED_DATE_TIME = '2025/04/20 (Sun.) 17:00'; // Matches the second date in the HTML
    const TICKET_QUANTITY = '1'; // Specify the number of tickets (e.g., '1' or '2')
    const RELOAD_INTERVAL = 1000; // Reduced to 1 second for faster reloads
    const MAX_RELOAD_ATTEMPTS = 350000; // Max 350,000 reloads
    const PRESALE_CODE = 'BZ406060891'; // Presale code for /ticket/verify page

    // Wait for jQuery to load
    function waitForJQuery(callback) {
        if (typeof $ === 'undefined') {
            console.log("jQuery not loaded yet, waiting...");
            setTimeout(() => waitForJQuery(callback), 100); // Reduced delay
        } else {
            console.log("jQuery loaded, starting script...");
            callback();
        }
    }

    // Optimized utility function to wait for an element using MutationObserver
    function waitForElementWithMutationObserver(selector, parentSelector, callback, timeout = 2000) {
        const parent = $(parentSelector).length ? $(parentSelector)[0] : document.body;
        const element = $(selector, parent).filter(':visible');
        if (element.length) {
            console.log(`Element already exists: ${selector}`);
            callback(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = $(selector, parent).filter(':visible');
            if (element.length) {
                console.log(`Element detected with MutationObserver: ${selector}`);
                obs.disconnect();
                callback(element);
            }
        });

        observer.observe(parent, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        setTimeout(() => {
            observer.disconnect();
            console.log(`Timeout: Element not found after ${timeout/1000} seconds: ${selector}`);
            callback(null);
        }, timeout);
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

    // Step 1: On the detail page, keep reloading until "Buy Now" button appears
    function handleDetailPage() {
        console.log("On detail page, looking for Buy Now button...");
        let reloadAttempts = 0;

        function checkForBuyNowButton() {
            waitForElementWithMutationObserver(".buy a", "body", (buyNowButton) => {
                if (buyNowButton) {
                    const href = buyNowButton.attr('href');
                    console.log(`Found '立即購票' button with href: ${href}`);
                    window.location.href = href;
                    console.log("Navigating to game page in the same tab...");
                } else {
                    reloadAttempts++;
                    if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
                        console.log(`Max reload attempts (${MAX_RELOAD_ATTEMPTS}) reached, stopping.`);
                        isScriptRunning = false;
                        return;
                    }
                    console.log(`Buy Now button not found, reloading page in ${RELOAD_INTERVAL/1000} seconds (Attempt ${reloadAttempts}/${MAX_RELOAD_ATTEMPTS})...`);
                    setTimeout(() => {
                        console.log("Reloading page now...");
                        window.location.reload();
                    }, RELOAD_INTERVAL);
                }
            }, 1000); // Reduced timeout
        }

        checkForBuyNowButton();
    }

    // Step 2: On the game page, select the date and click "Find tickets"
    function handleGamePage() {
        console.log("On game page, starting date selection process...");
        let reloadAttempts = 0;

        function checkForDateAndButton() {
            waitForElementWithMutationObserver("#gameList tr", "#gameList", () => {
                console.log("Game list table rows loaded, looking for date row...");

                // Cache the rows to avoid multiple DOM queries
                const rows = $("#gameList tr");
                const normalizedPreferredDate = PREFERRED_DATE_TIME.replace(/\s+/g, ' ');

                // Debug: Log the text of each row's first <td>
                rows.each(function() {
                    const dateText = $(this).find('td').first().text().trim().replace(/\s+/g, ' ');
                    console.log(`Row date text: '${dateText}'`);
                });

                // Find the target row directly with normalized comparison
                const targetRow = rows.filter(function() {
                    const dateText = $(this).find('td').first().text().trim().replace(/\s+/g, ' ');
                    return dateText === normalizedPreferredDate;
                });

                if (targetRow.length) {
                    const dateKey = targetRow.attr('data-key');
                    console.log(`Found preferred date '${PREFERRED_DATE_TIME}' with data-key=${dateKey}`);
                    const dateButtonSelector = `tr[data-key='${dateKey}'] .btn-primary`;
                    waitForElementWithMutationObserver(dateButtonSelector, "#gameList", (dateButton) => {
                        if (dateButton) {
                            const href = dateButton.attr('data-href');
                            console.log(`Found 'Find tickets' button with data-href: ${href}`);
                            window.location.href = href;
                            console.log(`Navigating to ticket area page for date with data-key=${dateKey}`);
                        } else {
                            reloadAttempts++;
                            if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
                                console.log(`Max reload attempts (${MAX_RELOAD_ATTEMPTS}) reached on game page, stopping.`);
                                isScriptRunning = false;
                                return;
                            }
                            console.log(`Find tickets button not found for '${PREFERRED_DATE_TIME}', reloading page immediately (Attempt ${reloadAttempts}/${MAX_RELOAD_ATTEMPTS})...`);
                            window.location.reload();
                        }
                    }, 1000); // Reduced timeout
                } else {
                    reloadAttempts++;
                    if (reloadAttempts >= MAX_RELOAD_ATTEMPTS) {
                        console.log(`Max reload attempts (${MAX_RELOAD_ATTEMPTS}) reached on game page, stopping.`);
                        isScriptRunning = false;
                        return;
                    }
                    console.log(`Preferred date '${PREFERRED_DATE_TIME}' not found, reloading page in ${RELOAD_INTERVAL/1000} seconds (Attempt ${reloadAttempts}/${MAX_RELOAD_ATTEMPTS})...`);
                    setTimeout(() => {
                        console.log("Reloading page now...");
                        window.location.reload();
                    }, RELOAD_INTERVAL);
                }
            }, 2000); // Reduced timeout
        }

        checkForDateAndButton();
    }

    // Step 2.5: On the verify page, enter the presale code and submit
    function handleVerifyPage() {
        console.log("On verify page, entering presale code...");
        waitForElementWithMutationObserver("input[name='checkCode']", "body", (codeInput) => {
            if (!codeInput) {
                console.log("Presale code input field not found, please inspect the input field and share its HTML.");
                isScriptRunning = false;
                return;
            }
            codeInput.val(PRESALE_CODE);
            console.log(`Entered presale code: ${PRESALE_CODE}`);

            waitForElementWithMutationObserver("#form-ticket-verify button[type='submit'], .btn-primary:contains('Submit')", "body", (submitButton) => {
                if (!submitButton) {
                    console.log("Submit button not found on verify page, please inspect the button and share its HTML.");
                    isScriptRunning = false;
                    return;
                }
                submitButton.click();
                console.log("Submit button clicked on verify page");
            }, 1000); // Reduced timeout
        }, 1000); // Reduced timeout
    }

    // Step 3: On the ticket area page, start from group_2, then group_3, group_4, and so on
    function handleTicketAreaPage() {
        console.log("On ticket area page, starting seat selection process from group_2, then group_3, group_4, and so on...");

        // Fetch all seat groups and their labels
        const seatGroups = $('[id^="group_"]').filter(function() {
            return this.id.match(/^group_\d+$/); // Match IDs like group_0, group_1, etc.
        });

        if (seatGroups.length === 0) {
            console.log("No seat groups found on ticket area page, stopping.");
            isScriptRunning = false;
            return;
        }

        // Map groups to their data (including price for logging purposes)
        const groupData = seatGroups.map(function() {
            const groupId = this.id;
            const label = $(`.zone-label[data-id="${groupId}"]`).text(); // e.g., "6800區 VIP"
            const priceMatch = label.match(/\d+/); // Extract first number (e.g., "6800")
            const price = priceMatch ? parseInt(priceMatch[0], 10) : Infinity; // Use Infinity if no price found
            const groupNumber = parseInt(groupId.replace('group_', ''), 10); // Extract the number from group_X
            return { id: groupId, element: $(this), price: price, groupNumber: groupNumber };
        }).get();

        console.log(`Found ${groupData.length} seat groups: ${groupData.map(g => `${g.id} (${g.price})`).join(', ')}`);

        // Sort groups by numerical ID (group_0, group_1, group_2, etc.)
        const sortedGroups = groupData.sort((a, b) => a.groupNumber - b.groupNumber);
        const group2Data = sortedGroups.find(g => g.id === 'group_2');
        const remainingGroups = sortedGroups.filter(g => g.groupNumber >= 3); // Start from group_3

        // Function to process a single group
        function processGroup(group, callback) {
            const groupId = group.id;
            console.log(`Checking seat group: ${groupId} (${group.price})...`);

            waitForElementWithMutationObserver(`#${groupId} li a`, `#${groupId}`, (ticketLinks) => {
                if (!ticketLinks || ticketLinks.length === 0) {
                    console.log(`No ticket links found in group ${groupId}, skipping...`);
                    callback(false);
                    return;
                }

                let availableTicket = null;
                ticketLinks.each(function() {
                    const ticketText = $(this).text();
                    if (!ticketText.includes('已售完') && !ticketText.includes('Sold out')) {
                        availableTicket = $(this);
                        return false; // Break the loop
                    }
                });

                if (availableTicket) {
                    console.log(`Ticket selected in ${groupId}: ${availableTicket.text()} (Price: ${group.price})`);
                    const href = availableTicket.attr('href');
                    if (href && href !== '#' && href !== 'javascript:void(0)') {
                        console.log(`Seat link has href: ${href}, navigating directly...`);
                        window.location.href = href;
                    } else {
                        console.log("Seat link has no href or uses JavaScript, simulating click...");
                        simulateClick(availableTicket[0]);
                    }
                    callback(true);
                } else {
                    console.log(`All tickets in ${groupId} are sold out, checking next group...`);
                    callback(false);
                }
            }, 1000); // Reduced timeout
        }

        // Process groups sequentially without staggering delays
        let foundAvailableTicket = false;

        // Check group_2 first
        if (group2Data) {
            console.log("Prioritizing group_2...");
            processGroup(group2Data, (found) => {
                foundAvailableTicket = found;
                if (!foundAvailableTicket) {
                    checkRemainingGroups();
                }
            });
        } else {
            console.log("group_2 not found, proceeding with remaining groups...");
            checkRemainingGroups();
        }

        // Check remaining groups sequentially
        function checkRemainingGroups() {
            let currentIndex = 0;

            function processNextGroup() {
                if (currentIndex >= remainingGroups.length || foundAvailableTicket) {
                    if (!foundAvailableTicket) {
                        console.log("No available tickets found in any group, stopping.");
                        isScriptRunning = false;
                    }
                    return;
                }

                const group = remainingGroups[currentIndex];
                processGroup(group, (found) => {
                    foundAvailableTicket = found;
                    currentIndex++;
                    processNextGroup();
                });
            }

            processNextGroup();
        }
    }

    // Step 4: On the ticket quantity page, select quantity and check terms
    function handleTicketQuantityPage() {
        console.log("On ticket quantity page, selecting quantity and checking terms...");

        waitForElementWithMutationObserver("select[name*='ticketPrice'], #ticketPriceList select", "body", (quantitySelect) => {
            if (!quantitySelect) {
                console.log("Ticket quantity dropdown not found, please inspect the dropdown and share its HTML.");
                isScriptRunning = false;
                return;
            }
            quantitySelect.val(TICKET_QUANTITY);
            quantitySelect.trigger("change");
            console.log(`Selected ticket quantity: ${TICKET_QUANTITY}`);

            waitForElementWithMutationObserver("input[type='checkbox']", "body", (checkbox) => {
                if (!checkbox) {
                    console.log("Terms of Use checkbox not found, please inspect the checkbox and share its HTML.");
                    isScriptRunning = false;
                    return;
                }
                checkbox.prop('checked', true);
                console.log("Checked Terms of Use checkbox");
                console.log("Script stopped. Please manually click the 'Submit' button, enter the CAPTCHA code, and click 'Verify'.");
                isScriptRunning = false;
            }, 1000); // Reduced timeout
        }, 1000); // Reduced timeout
    }

    // Main function to determine the current page and execute the appropriate step
    function startTicketPurchase() {
        if (isScriptRunning) {
            console.log("Script is already running, skipping execution.");
            return;
        }

        isScriptRunning = true;

        let currentUrl = window.location.href;
        console.log("Script triggered for URL: " + currentUrl);

        if (currentUrl.includes('/activity/detail/')) {
            console.log("Detected detail page, running handleDetailPage...");
            handleDetailPage();
        } else if (currentUrl.includes('/activity/game/')) {
            console.log("Detected game page, running handleGamePage...");
            handleGamePage();
        } else if (currentUrl.includes('/ticket/verify/')) {
            console.log("Detected verify page, running handleVerifyPage...");
            handleVerifyPage();
        } else if (currentUrl.includes('/ticket/area/')) {
            console.log("Detected ticket area page, running handleTicketAreaPage...");
            handleTicketAreaPage();
        } else if (currentUrl.includes('/ticket/ticket/')) {
            console.log("Detected ticket quantity page, running handleTicketQuantityPage...");
            handleTicketQuantityPage();
        } else {
            console.log("Script does not match any expected page: " + currentUrl);
            isScriptRunning = false;
        }
    }

    // Start the process
    console.log("Initializing script...");
    waitForJQuery(startTicketPurchase);
})();
