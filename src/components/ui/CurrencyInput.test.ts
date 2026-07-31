
import CurrencyInput from "./CurrencyInput";

const onChange = jest.fn();

beforeEach(() => jest.clearAllMocks());

describe("CurrencyInput accessibility contract", () => {
  it("passes id, name, aria-describedby, and aria-invalid to the underlying input", () => {
    const onChangeMock = jest.fn();
    render(<CurrencyInput id="amount" name="rate" value="1000" onChange={onChangeMock} aria-describedby="rate-help" aria-invalid={true} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "amount");
    expect(input).toHaveAttribute("name", "rate");
    expect(input).toHaveAttribute("aria-describedby", "rate-help");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
