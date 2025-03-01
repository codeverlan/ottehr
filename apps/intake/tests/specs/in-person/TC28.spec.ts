import { expect, test } from '@playwright/test';
import { FillingInfo } from '../../utils/in-person/FillingInfo';
import { BookPrebookVisit } from '../../utils/in-person/BookPrebookVisit';

test.describe.serial('TC28', () => {
  let bookingURL: string | undefined;
  let month: string;
  let day: string;
  let year: string;
  test.skip('TC28 prereq', async ({ page }) => {
    const BookVisit = new BookPrebookVisit(page);
    const fillingInfo = new FillingInfo(page);
    await page.goto(`/location/${process.env.STATE_ONE}/${process.env.SLUG_ONE}/prebook`);
    await expect(page.getByRole('tab', { name: 'Today' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await fillingInfo.selectSlot();
    const continueButton = page.getByRole('button', { name: 'Continue' });
    await continueButton.click();
    const bookingData = await BookVisit.bookNewPatientLess18();
    bookingURL = bookingData.bookingURL;
    month = bookingData.randomMonth;
    day = bookingData.randomDay;
    year = bookingData.randomYear;
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await fillingInfo.cancelPrebookVisit();
  });

  test.skip('TC28 ', async ({ page }) => {
    const fillingInfo = new FillingInfo(page);
    const continueButton = page.getByRole('button', { name: 'Continue' });
    await page.goto(`${bookingURL}`);
    await expect(page.getByRole('button', { name: 'Proceed to paperwork' })).toBeVisible();
    await page.getByRole('button', { name: 'Proceed to paperwork' }).click();
    await expect(page.getByRole('heading', { name: 'Contact information' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Parent/Guardian', { exact: true })).toBeHidden();
    await expect(page.getByText('Patient', { exact: true })).toBeHidden();
    await expect(page.locator('label[id="guardian-number-label"]')).toBeVisible();
    await expect(page.locator('label[id="guardian-email-label"]')).toBeVisible();
    await expect(page.locator('input[id*="guardian-email"]')).toBeVisible();
    await expect(page.locator('input[id*="guardian-number"]')).toBeVisible();
    await expect(page.locator('label[id="patient-email-label"]')).toBeHidden();
    await expect(page.locator('label[id="patient-number-label"]')).toBeHidden();
    await expect(page.locator('input[id*="patient-email"]')).toBeHidden();
    await expect(page.locator('input[id*="patient-number"]')).toBeHidden();
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.goto(`${bookingURL}`);
    await page.getByRole('button', { name: 'Proceed to paperwork' }).click();
    await expect(page.getByText(`Confirm patient's date of birth`)).toBeVisible();
    await fillingInfo.fillCorrectDOB(month, day, year);
    await continueButton.click();
    await expect(page.getByText('Contact information')).toBeVisible();
    await expect(page.getByText('Parent/Guardian', { exact: true })).toBeHidden();
    await expect(page.getByText('Patient (Self)', { exact: true })).toBeHidden();
    await expect(page.locator('label[id="guardian-number-label"]')).toBeVisible();
    await expect(page.locator('label[id="guardian-email-label"]')).toBeVisible();
    await expect(page.locator('input[id*="guardian-email"]')).toBeVisible();
    await expect(page.locator('input[id*="guardian-number"]')).toBeVisible();
    await expect(page.locator('label[id="patient-email-label"]')).toBeHidden();
    await expect(page.locator('label[id="patient-number-label"]')).toBeHidden();
    await expect(page.locator('input[id*="patient-email"]')).toBeHidden();
    await expect(page.locator('input[id*="patient-number"]')).toBeHidden();
  });
});
