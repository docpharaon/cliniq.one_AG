// Custom Pages Router error page to prevent React 18/19 version
// conflict during SSG. Uses createElement instead of JSX to avoid
// the React serialization issue with mixed React versions.
function CustomError() {
    return null;
}

CustomError.getInitialProps = () => {
    return { statusCode: 500 };
};

export default CustomError;
