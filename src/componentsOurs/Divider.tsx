import PropTypes from "prop-types";

export const Divider = ({
  orientation = "horizontal",
  thickness = "1px",
  color = "var(--divider)",
  length = "100%",
}) => {
  const isHorizontal = orientation === "horizontal";
  return (
    <div
      style={{
        width: isHorizontal ? length : thickness,
        height: isHorizontal ? thickness : length,
        backgroundColor: color,
        margin: isHorizontal ? `${thickness} 0` : `0 ${thickness}`,
      }}
      className="bg-[var(--divider)] z-10"
    />
  );
};

Divider.propTypes = {
  orientation: PropTypes.oneOf(["horizontal", "vertical"]),
  thickness: PropTypes.string,
  color: PropTypes.string,
  length: PropTypes.string,
};
